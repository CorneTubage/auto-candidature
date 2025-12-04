import os
import smtplib
import ssl
import csv
import io
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy

# Configuration de l'application
app = Flask(__name__, static_folder='templates') # Astuce pour charger js/css depuis templates si besoin
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- MODÈLES DE DONNÉES ---

class Settings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    smtp_host = db.Column(db.String(100), default="smtp.gmail.com")
    smtp_port = db.Column(db.Integer, default=465)
    smtp_email = db.Column(db.String(100), default="")
    smtp_password = db.Column(db.String(100), default="")
    candidate_first_name = db.Column(db.String(50), default="Prenom")
    candidate_last_name = db.Column(db.String(50), default="Nom")
    documents_path = db.Column(db.String(300), default=os.path.join(os.getcwd(), 'documents'))
    email_subject = db.Column(db.String(200), default="Candidature spontanée pour")
    email_body = db.Column(db.Text, default="""Bonjour,\n\nJe me permets de vous contacter...""")

class Company(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default="Pas encore contactée")
    sent_at = db.Column(db.DateTime, nullable=True)
    error_message = db.Column(db.String(255), nullable=True)

# --- FONCTIONS UTILITAIRES ---

def get_file_status(base_path, doc_type, company_name, first_name, last_name):
    """
    Retourne le statut du fichier et le chemin du fichier à utiliser.
    Priorité : Spécifique > Générique > Manquant
    """
    clean_company = company_name.strip()
    
    # Noms attendus
    specific_name = f"{doc_type}_{clean_company}.pdf"
    generic_name = f"{doc_type}_{first_name}_{last_name}.pdf"
    
    specific_path = os.path.join(base_path, specific_name)
    generic_path = os.path.join(base_path, generic_name)
    
    if os.path.exists(specific_path):
        return "specific", specific_path, specific_name
    elif os.path.exists(generic_path):
        return "generic", generic_path, generic_name
    else:
        return "missing", None, None

# --- ROUTES API ---

@app.route('/')
def index():
    return render_template('index.html')

# Route pour servir le JS/CSS si ils sont dans templates (pour ta structure spécifique)
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('templates', filename)

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    settings = Settings.query.first()
    if not settings:
        settings = Settings()
        db.session.add(settings)
        db.session.commit()

    if request.method == 'POST':
        data = request.json
        # Mise à jour des champs...
        for key, value in data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        db.session.commit()
        return jsonify({"message": "Paramètres sauvegardés"})

    return jsonify({
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "smtp_email": settings.smtp_email,
        "smtp_password": settings.smtp_password,
        "candidate_first_name": settings.candidate_first_name,
        "candidate_last_name": settings.candidate_last_name,
        "documents_path": settings.documents_path,
        "email_subject": settings.email_subject,
        "email_body": settings.email_body
    })

@app.route('/api/companies', methods=['GET', 'POST'])
def handle_companies():
    if request.method == 'POST':
        data = request.json
        new_company = Company(name=data['name'], email=data['email'])
        db.session.add(new_company)
        db.session.commit()
        return jsonify({"message": "Entreprise ajoutée", "id": new_company.id})
    
    companies = Company.query.order_by(Company.id.desc()).all()
    result = []
    
    settings = Settings.query.first()
    doc_path = settings.documents_path if settings else ""
    fname = settings.candidate_first_name if settings else "Prenom"
    lname = settings.candidate_last_name if settings else "Nom"
    
    for c in companies:
        # Vérification intelligente des fichiers
        cv_status, _, _ = get_file_status(doc_path, "CV", c.name, fname, lname)
        lm_status, _, _ = get_file_status(doc_path, "Lettre_de_motivation", c.name, fname, lname)
        
        result.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "status": c.status,
            "sent_at": c.sent_at.strftime("%d/%m/%Y %H:%M") if c.sent_at else None,
            "error_message": c.error_message,
            "files_status": {
                "cv": cv_status,      # 'specific', 'generic', 'missing'
                "lm": lm_status       # 'specific', 'generic', 'missing'
            }
        })
    return jsonify(result)

# NOUVELLE ROUTE : MISE À JOUR ENTREPRISE
@app.route('/api/companies/<int:id>', methods=['PUT'])
def update_company(id):
    company = Company.query.get(id)
    if not company:
        return jsonify({"error": "Non trouvé"}), 404
    
    data = request.json
    if 'name' in data:
        company.name = data['name']
    if 'email' in data:
        company.email = data['email']
    
    db.session.commit()
    return jsonify({"message": "Entreprise mise à jour"})

@app.route('/api/companies/import', methods=['POST'])
def import_csv():
    if 'file' not in request.files:
        return jsonify({"error": "Aucun fichier envoyé"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Nom de fichier vide"}), 400

    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream, delimiter=',') # Support virgule standard
        
        # Fallback si le délimiteur est un point-virgule
        if not csv_input.fieldnames or 'email' not in csv_input.fieldnames:
            stream.seek(0)
            csv_input = csv.DictReader(stream, delimiter=';')

        count = 0
        for row in csv_input:
            # Normalisation des clés (gestion minuscule/majuscule)
            row = {k.lower().strip(): v for k, v in row.items()}
            
            # Recherche des colonnes probables
            name = row.get('nom') or row.get('name') or row.get('entreprise') or row.get('company')
            email = row.get('email') or row.get('mail') or row.get('contact')
            
            if name and email:
                new_company = Company(name=name, email=email)
                db.session.add(new_company)
                count += 1
        
        db.session.commit()
        return jsonify({"message": f"{count} entreprises importées"})
    except Exception as e:
        return jsonify({"error": f"Erreur lecture CSV: {str(e)}"}), 500

@app.route('/api/companies/<int:id>', methods=['DELETE'])
def delete_company(id):
    company = Company.query.get(id)
    if company:
        db.session.delete(company)
        db.session.commit()
        return jsonify({"message": "Supprimé"})
    return jsonify({"error": "Non trouvé"}), 404

@app.route('/api/send/<int:company_id>', methods=['POST'])
def send_email(company_id):
    company = Company.query.get(company_id)
    settings = Settings.query.first()
    
    if not company or not settings:
        return jsonify({"error": "Configuration manquante"}), 400

    # 1. Récupération des bons fichiers
    cv_status, cv_path, _ = get_file_status(settings.documents_path, "CV", company.name, settings.candidate_first_name, settings.candidate_last_name)
    lm_status, lm_path, _ = get_file_status(settings.documents_path, "Lettre_de_motivation", company.name, settings.candidate_first_name, settings.candidate_last_name)

    if cv_status == "missing" or lm_status == "missing":
        return jsonify({"error": f"Fichiers manquants pour {company.name} (ni spécifique, ni générique)."}), 404

    # Noms finaux pour la pièce jointe (ce que le recruteur voit)
    final_cv_name = f"CV_{settings.candidate_first_name}_{settings.candidate_last_name}.pdf"
    final_lm_name = f"Lettre_de_motivation_{settings.candidate_first_name}_{settings.candidate_last_name}.pdf"

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.smtp_email
        msg['To'] = company.email
        msg['Subject'] = settings.email_subject

        body_content = settings.email_body.replace("{{nom_entreprise}}", company.name.strip())
        msg.attach(MIMEText(body_content, 'plain'))

        # Attachement CV
        with open(cv_path, "rb") as f:
            part = MIMEApplication(f.read(), Name=final_cv_name)
            part['Content-Disposition'] = f'attachment; filename="{final_cv_name}"'
            msg.attach(part)
        
        # Attachement Lettre
        with open(lm_path, "rb") as f:
            part = MIMEApplication(f.read(), Name=final_lm_name)
            part['Content-Disposition'] = f'attachment; filename="{final_lm_name}"'
            msg.attach(part)

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context) as server:
            server.login(settings.smtp_email, settings.smtp_password)
            server.sendmail(settings.smtp_email, company.email, msg.as_string())

        company.status = "Candidature envoyée"
        company.sent_at = datetime.now()
        company.error_message = None
        db.session.commit()
        
        return jsonify({"success": True, "message": f"Envoyé à {company.name}"})

    except Exception as e:
        company.status = "Erreur"
        company.error_message = str(e)
        db.session.commit()
        return jsonify({"success": False, "error": str(e)}), 500

with app.app_context():
    db.create_all()
    if not Settings.query.first():
        db.session.add(Settings())
        db.session.commit()

if __name__ == '__main__':
    app.run(debug=True, port=5000)

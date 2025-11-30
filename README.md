# 🚀 AutoApply - Automatisateur de Candidatures

Un outil simple et élégant pour envoyer automatiquement des candidatures spontanées personnalisées par email.

Il permet de gérer une liste d'entreprises, d'associer automatiquement les bons fichiers (CV et Lettre de motivation) et d'envoyer un email propre via SMTP.

## 📂 Structure du Projet
Voici l'organisation des fichiers telle que configurée :

```
job-automator
 ┣ documents/           # Placez vos PDF ici (CV_Prenom_Nom.pdf, Lettre_de_motivation_Entreprise.pdf)
 ┣ templates/
 ┃ ┣ favicon.svg        # Le favicon
 ┃ ┣ index.html         # L'interface utilisateur
 ┃ ┣ main.js            # Logique Frontend (appels API)
 ┃ ┗ style.css          # Styles personnalisés
 ┣ venv/                # Python
 ┃ ┗ ...
 ┣ .gitignore           # Empêche l'envoie de certaine donnée
 ┣ app.py               # Serveur Backend (Flask)
 ┣ requirements.txt     # Liste des dépendances Python
 ┗ README.md            # Ce fichier
 ```

⚠️ Note Technique Flask : Par défaut, Flask cherche les fichiers CSS et JS dans un dossier nommé static.
Si votre CSS et JS ne chargent pas, déplacez main.js et style.css dans un dossier nommé static (au même niveau que templates), et mettez à jour les liens dans index.html.

## 🛠️ Installation

### 1. Prérequis

- Python (version 3.8 ou supérieure) installé sur votre machine.

- Un fournisseur d'email permettant le SMTP (ex: Gmail).

### 2. Installation des dépendances

Ouvrez votre terminal dans le dossier job-automator et exécutez :

```
pip install -r requirements.txt
```

### 3. Lancement de l'application

Toujours dans le terminal, lancez le serveur :

```
python app.py
```

Vous verrez un message indiquant que le serveur tourne (généralement sur `http://127.0.0.1:5000`).
Ouvrez ce lien dans votre navigateur web.

## ⚙️ Configuration SMTP (Gmail)

Pour que l'application puisse envoyer des mails à votre place, vous devez configurer le SMTP. Voici la marche à suivre pour Gmail (recommandé) :

- Connectez-vous à votre compte Google.

- Allez dans Gérer votre compte Google > Sécurité.

- Activez la Validation en deux étapes (si ce n'est pas déjà fait).

- Cherchez l'option Mots de passe d'application (ou tapez-le dans la barre de recherche des paramètres).

- Créez un nouveau mot de passe (nommez-le "AutoApply" par exemple).

- Google va vous donner un mot de passe de 16 caractères (ex: abcd efgh ijkl mnop). Copiez-le.

### Dans l'interface de l'application (Onglet Configuration) :

- Hôte SMTP : `smtp.gmail.com`

- Port : `465`

- Email : `votre.email@gmail.com`

- Mot de passe : Collez le mot de passe d'application de 16 caractères (pas votre mot de passe habituel !).

## 📖 Guide d'Utilisation

### 1. Préparation des fichiers
Déposez vos fichiers PDF dans le dossier `documents` (ou modifiez le chemin dans la configuration).

Règle de nommage impérative :
Pour une entreprise nommée Ubisoft, vos fichiers doivent s'appeler :

- `CV_Ubisoft.pdf`

- `Lettre_de_motivation_Ubisoft.pdf`

L'application se chargera de les renommer (ex: `CV_Noe_Arhan.pdf`) au moment de l'envoi. Vos fichiers originaux restent intacts.

### 2. Configuration de l'identité

Dans l'onglet Configuration de l'application :

- Renseignez votre Prénom et Nom (ceux-ci seront utilisés pour renommer les pièces jointes envoyées).

- Personnalisez le sujet et le corps du mail si besoin. Utilisez `{{nom_entreprise}}` dans le texte pour qu'il soit remplacé automatiquement.

### 3. Gestion des candidatures

- Allez sur le Tableau de bord.

- Cliquez sur Ajouter une entreprise.

- Entrez le nom (ex: `Ubisoft`) et l'email du recruteur.
    - Astuce : Le nom doit correspondre exactement à la fin du nom de vos fichiers PDF.

- L'application vérifie immédiatement si les fichiers existent (indicateur "Prêts" en vert ou "Manquants" en rouge).

### 4. Envoi

- Cliquez sur le bouton Envoyer à côté de l'entreprise.

- L'application envoie le mail, renomme les pièces jointes à la volée, et met à jour le statut en "Candidature envoyée".

## ❓ Résolution de problèmes courants

### Erreur : "Authentication Required" ou "Bad Credentials"
- Vérifiez que vous utilisez bien le Mot de passe d'application et non votre mot de passe Gmail standard.

- Vérifiez que l'email expéditeur correspond bien au compte du mot de passe.

### Les styles (CSS) ou le JS ne s'affichent pas
- Assurez-vous d'avoir déplacé `style.css` et `main.js` dans un dossier `static/` si Flask ne les trouve pas dans `templates/`.

- Vérifiez dans `index.html` que les liens sont corrects (ex: `<link rel="stylesheet" href="/static/style.css">`).

### Erreur : Fichiers introuvables
- Vérifiez que le chemin du dossier dans la "Configuration" est correct (chemin absolu recommandé, ex: C:\Users\Moi\Projets\job-automator\documents).

- Vérifiez que vos fichiers respectent la casse exacte (Majuscules/Minuscules) si vous êtes sur Linux/Mac.
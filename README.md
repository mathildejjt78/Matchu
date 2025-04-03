# Projet Three.js

Un projet simple utilisant Three.js pour créer des scènes 3D interactives.

## Installation

1. Assurez-vous d'avoir [Node.js](https://nodejs.org/) installé sur votre machine
2. Clonez ce dépôt
3. Installez les dépendances :
```bash
npm install
```

## Développement local

Pour lancer le projet en local :
```bash
npm start
```
Le projet sera accessible à l'adresse : http://localhost:8080

## Déploiement

Ce projet peut être déployé sur plusieurs plateformes :

### GitHub Pages
1. Créez un dépôt GitHub
2. Poussez votre code
3. Dans les paramètres du dépôt, activez GitHub Pages
4. Sélectionnez la branche main comme source

### Netlify
1. Créez un compte sur [Netlify](https://www.netlify.com/)
2. Connectez votre dépôt GitHub
3. Sélectionnez ce dépôt
4. Les paramètres par défaut fonctionneront car nous utilisons un serveur statique

### Vercel
1. Créez un compte sur [Vercel](https://vercel.com/)
2. Connectez votre dépôt GitHub
3. Sélectionnez ce dépôt
4. Les paramètres par défaut fonctionneront

## Structure du projet

- `index.html` : Point d'entrée de l'application
- `script.js` : Code Three.js principal
- `package.json` : Configuration du projet et dépendances

## Personnalisation

Vous pouvez modifier les paramètres suivants dans `script.js` :
- La couleur du cube : modifiez la valeur `color` dans `MeshBasicMaterial`
- La vitesse de rotation : modifiez les valeurs dans la fonction `animate()`
- La taille du cube : modifiez les paramètres dans `BoxGeometry` 
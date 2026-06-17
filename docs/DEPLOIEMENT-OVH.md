# Déploiement OVH VPS - FTJJ MERN

## 1. Préparer le serveur
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install nginx git ufw certbot python3-certbot-nginx -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
sudo npm i -g pm2
```

## 2. Installer MongoDB
Recommandé production : MongoDB Atlas. Alternative : MongoDB sur VPS.

## 3. Variables backend
Copier `backend/.env.example` vers `backend/.env` et remplir :
```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=changer-cette-cle
CLIENT_URL=https://votre-domaine.tn
```

## 4. Build frontend
```bash
cd frontend
npm install
npm run build
sudo mkdir -p /var/www/ftjj
sudo cp -r dist/* /var/www/ftjj/
```

## 5. Lancer backend
```bash
cd backend
npm install
npm run seed
pm2 start src/server.js --name ftjj-api
pm2 save
pm2 startup
```

## 6. Nginx
Voir `deploy/nginx-ftjj.conf`.

## 7. SSL
```bash
sudo certbot --nginx -d votre-domaine.tn -d www.votre-domaine.tn
```

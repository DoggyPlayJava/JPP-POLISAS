# Panduan Deploy Website JPP-POLISAS ke Server (Proxmox/Nginx)

Ini adalah panduan untuk meletakkan (deploy) aplikasi React/Vite (Single Page Application) ke dalam Virtual Machine / LXC di Proxmox menggunakan **Nginx**.

## Langkah 1: Sediakan Server (Ubuntu/Debian) di Proxmox

1. Log masuk ke Proxmox dan buka konsol VM/LXC yang akan digunakan untuk website ini.
2. Update sistem dan pasang Nginx:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install nginx -y
   ```
3. Semak jika Nginx sudah berjalan dengan melawati alamat IP server di browser (contoh: `http://192.168.1.xxx`).

## Langkah 2: Pindahkan Fail Website ke Server

Fail website yang sebenar berada di dalam fail `.zip` (`jpp-polisas-website.zip`).

1. Bawa masuk fail ZIP tersebut ke dalam server (boleh guna SCP, transper, WinSCP, FileZilla, dll).
2. Jika server belum ada program untuk unzip, pasangkan:
   ```bash
   sudo apt install unzip -y
   ```
3. Buat folder untuk simpan website:
   ```bash
   sudo mkdir -p /var/www/jpp-polisas
   ```
4. Masukkan (extract) isi ZIP tersebut ke dalam folder `/var/www/jpp-polisas`.

*Pastikan fail `index.html` dan folder-folder `assets` berada teratur di laluan `/var/www/jpp-polisas/index.html` dan BUKANNYA tersorok dalam sub-folder `/var/www/jpp-polisas/dist/index.html`.*

## Langkah 3: Konfigurasi Nginx untuk React (SPA)

Ini **sangat penting** untuk aplikasi React bagi memastikan "Routing" tidak mendapat ralat 404 jika di-refresh.

1. Buka dan buat fail konfig baharu:
   ```bash
   sudo nano /etc/nginx/sites-available/jpp-polisas
   ```
2. Salin dan tampal kod di bawah (Tukar `server_name` kepada nama domain sebenar atau alamat IP. Biarkan `_` jika ingin tangkap semua trafik):
   ```nginx
   server {
       listen 80;
       server_name _; # Gantikan dengan alamat IP atau nama domain anda

       root /var/www/jpp-polisas;
       index index.html index.htm;

       location / {
           # PENGATURAN WAJIB UNTUK REACT ROUTER:
           try_files $uri $uri/ /index.html;
       }

       # Prestasi fail (Caching) - Pilihan
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```
   *(Penting: Tekan `Ctrl+O`, terus tekan `Enter`, dan tekan `Ctrl+X` untuk save dan keluar dari program Nano).*

3. Aktifkan konfigurasi website ini dan padam konfigurasi asal Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/jpp-polisas /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   ```

## Langkah 4: Tetapkan Kebenaran (Permissions)

Beri kebenaran kepada worker sistem Nginx (`www-data`) untuk mengakses fail:
```bash
sudo chown -R www-data:www-data /var/www/jpp-polisas
sudo chmod -R 755 /var/www/jpp-polisas
```

## Langkah 5: Restart Nginx

Pastikan tiada kesilapan ditaip pada konfig file di atas. Check guna command ni:
```bash
sudo nginx -t
```
*Jika output keluar "syntax is ok" dan "test is successful":*
```bash
sudo systemctl restart nginx
```

Siap! Website sudah boleh diakses melalui IP pelayan atau domain!

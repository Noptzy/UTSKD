const { faker } = require('@faker-js/faker/locale/id_ID');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

// Konfigurasi database
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'tes1',
  port: 3306
};

// Set untuk menyimpan email unik
const usedEmails = new Set();

// Fungsi generate NIK sesuai format xx.xx.xxx
const generateNIK = (role, index) => {
  if (role === 'PMB') {
    // Format khusus PMB: 21.01.XXX
    return `21.01.${(index + 1).toString().padStart(3, '0')}`;
  }
  // Format umum untuk role lain: xx.xx.xxx
  const part1 = faker.number.int({ min: 10, max: 99 }).toString();
  const part2 = faker.number.int({ min: 10, max: 99 }).toString();
  const part3 = faker.number.int({ min: 100, max: 999 }).toString();
  return `${part1}.${part2}.${part3}`;
};

// Fungsi generate password
const generatePassword = () => crypto.createHash('sha1').update('password123').digest('hex');

// Fungsi generate email unik
const generateUniqueEmail = (name) => {
  let email;
  do {
    email = faker.internet.email({ 
      firstName: name.replace(/[^a-zA-Z]/g, ''),
      provider: 'example.com' 
    }).toLowerCase();
  } while (usedEmails.has(email));
  
  usedEmails.add(email);
  return email;
};

async function main() {
  let connection;
  
  try {
    // Buat koneksi database
    connection = await mysql.createConnection(dbConfig);
    console.log('Terhubung ke database MySQL...');

    // 1. Generate Data User
    // Generate PMB (4 user)
    const pmbUsers = Array.from({ length: 4 }, (_, i) => ({
      NIK: generateNIK('PMB', i),
      Nama_Lengkap: faker.person.fullName(),
      Email: `pmb${i+1}@example.com`,
      nohp: '08' + faker.string.numeric(10),
      foto: faker.image.avatar(),
      password: generatePassword(),
      role: 'PMB'
    }));

    // Generate CAMABA (600 user)
    const camabaUsers = Array.from({ length: 600 }, (_, i) => {
      const name = faker.person.firstName().replace(/\s/g, '');
      return {
        NIK: generateNIK('CAMABA', i),
        Nama_Lengkap: faker.person.fullName(),
        Email: generateUniqueEmail(name),
        nohp: '08' + faker.string.numeric(10),
        foto: faker.image.avatar(),
        password: generatePassword(),
        role: 'CAMABA'
      };
    });

    // Generate BelumReg (200 user)
    const belumRegUsers = Array.from({ length: 200 }, (_, i) => {
      const name = faker.person.firstName().replace(/\s/g, '');
      return {
        NIK: generateNIK('BelumReg', i),
        Nama_Lengkap: faker.person.fullName(),
        Email: generateUniqueEmail(name),
        nohp: '08' + faker.string.numeric(10),
        foto: faker.image.avatar(),
        password: generatePassword(),
        role: 'BelumReg'
      };
    });

    // [LANJUTKAN DENGAN BAGIAN INSERT DATA KE DATABASE...]
    // (Sisanya sama dengan kode sebelumnya, tetap perlu dipertahankan)

    // 2. Insert Data ke Database
    console.log('Memulai proses insert data...');
    
    // Gabungkan semua user
    const allUsers = [...pmbUsers, ...camabaUsers, ...belumRegUsers];
    
    // Insert user ke tabel User
    for (const [index, user] of allUsers.entries()) {
      await connection.execute(
        `INSERT INTO User 
        (NIK, Nama_Lengkap, Email, nohp, foto, password, role) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user.NIK,
          user.Nama_Lengkap,
          user.Email,
          user.nohp,
          user.foto,
          user.password,
          user.role
        ]
      );
      if ((index + 1) % 100 === 0) {
        console.log(`Inserted ${index + 1} users...`);
      }
    }

    // 3. Insert data PMB
    console.log('Memproses data PMB...');
    const [pmbUserIds] = await connection.execute('SELECT id FROM User WHERE role = "PMB"');
    for (const { id } of pmbUserIds) {
      await connection.execute(
        'INSERT INTO tb_pmb (UserId) VALUES (?)',
        [id]
      );
    }

    // 4. Insert data Camaba
    console.log('Memproses data CAMABA...');
    const [camabaUserIds] = await connection.execute('SELECT id FROM User WHERE role = "CAMABA"');
    let counter = 1;
    for (const { id } of camabaUserIds) {
      await connection.execute(
        'INSERT INTO tb_Camaba (UserId, noPendaftaran, statusPendaftaran) VALUES (?, ?, ?)',
        [id, `25${counter.toString().padStart(8, '0')}`, counter <= 450]
      );
      counter++;
    }

    // 5. Insert data BelumReg
    console.log('Memproses data BelumReg...');
    const [belumRegUserIds] = await connection.execute('SELECT id FROM User WHERE role = "BelumReg"');
    counter = 1;
    for (const { id } of belumRegUserIds) {
      await connection.execute(
        'INSERT INTO tb_BelumReg (UserId, buktiTf, isVerif) VALUES (?, ?, ?)',
        [id, `bukti_${counter}.jpg`, counter <= 100]
      );
      counter++;
    }

    console.log('\n✅ Semua data berhasil diinsert!');
    console.log(`Total data:
    - User: ${allUsers.length}
    - PMB: ${pmbUserIds.length}
    - CAMABA: ${camabaUserIds.length}
    - BelumReg: ${belumRegUserIds.length}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Koneksi database ditutup');
    }
  }
}

main();
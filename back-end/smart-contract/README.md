
# Decentralized Health Record Smart Contracts

Proyek ini berisi kumpulan smart contract inti untuk aplikasi Decentralized Health Record (DHR) berbasis blockchain. Sistem ini memungkinkan manajemen rekam medis yang aman, terdesentralisasi, dan dapat diakses lintas institusi dengan kontrol penuh oleh pasien.

## Fitur Utama
- **Manajemen Identitas Terdesentralisasi (DID):**
	- Pasien mendaftarkan dan mengelola identitas digital mereka sendiri.
- **Pembuatan & Penyimpanan Rekam Medis:**
	- Data medis dienkripsi & disimpan off-chain (misal: IPFS), hash-nya dicatat di blockchain.
- **Jaringan Validator:**
	- Validator (RS, klinik, lab) memverifikasi data sebelum dicatat.
- **Akses & Perizinan:**
	- Pasien dapat memberi/mencabut izin akses data ke dokter/RS.
- **Sistem Insentif (Token):**
	- Validator & kontributor data mendapat reward token.
- **Ekosistem Data & Riset:**
	- Peneliti dapat mengajukan permintaan data anonim untuk analisis statistik.

## Struktur Kontrak

- `DecentralizedHealthRecord.sol`  
	Kontrak inti untuk manajemen identitas, pencatatan hash rekam medis, dan akses data pasien.

- `PermissionAccessControl.sol`  
	Kontrak modular untuk pengelolaan izin akses data pasien ke pihak lain (dokter/RS).

- `ValidatorManagement.sol`  
	Kontrak untuk pendaftaran, penghapusan, dan log verifikasi validator.

- `DHRToken.sol`  
	Kontrak ERC20 untuk reward/insentif validator & kontributor data.

- `ResearchAnalytics.sol`  
	Kontrak untuk permintaan data anonim/statistik oleh peneliti dan publikasi hasil analisis.

## Alur Penggunaan
1. **Pasien mendaftar DID** melalui aplikasi → data DID dicatat di blockchain.
2. **Validator** (RS/lab) menambahkan hash rekam medis pasien ke blockchain.
3. **Pasien** dapat memberi/mencabut izin akses data ke dokter/RS.
4. **Dokter/RS** dapat mengakses riwayat medis pasien jika diizinkan.
5. **Peneliti** mengajukan permintaan data anonim, sistem mengagregasi & mempublikasikan hasil statistik.
6. **Reward token** didistribusikan ke validator & kontributor data.

## Integrasi Off-Chain
- Enkripsi data medis, upload ke IPFS, dan agregasi statistik dilakukan di aplikasi (off-chain), bukan di smart contract.
- Smart contract hanya menyimpan hash, mengelola izin, dan mendistribusikan reward.

## Build & Test
1. Pastikan sudah install [Foundry](https://book.getfoundry.sh/).
2. Build:
	 ```
	 forge build
	 ```
3. Test:
	 ```
	 forge test
	 ```

## Catatan
- Kontrak dapat dikembangkan lebih lanjut untuk fitur granular permission, audit log, multi-role, dsb.
- Pastikan integrasi aplikasi dan off-chain storage (IPFS) dilakukan dengan benar untuk keamanan data.

---

**Kontribusi & pertanyaan silakan diajukan melalui repository ini.**

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

-- 0009: update identitas perusahaan ke CV REV BUMI NUSANTARA
-- Alamat Cigudeg Bogor, NPWP, BCA, website, email baru
alter table public.companies add column if not exists npwp text;
alter table public.companies add column if not exists website text;

update public.companies set
  name = 'CV REV BUMI NUSANTARA',
  brand = 'REV Bumi Nusantara',
  code = 'RBN',
  address = 'Kp. Lebakwangi Pasar, Desa/Kelurahan Rengasjajar, Kec. Cigudeg, Kab. Bogor, Provinsi Jawa Barat',
  phone = '+62 821-7689-302',
  email = 'kontak@revbuminusantara.biz.id',
  primary_color = '#003C16',
  npwp = '1000000009047611',
  website = 'www.revbuminusantara.biz.id'
where id = 'comp-rev-01';

// Applique un fichier SQL via le pooler transaction (port 6543, eu-west-1).
import fs from "fs"; import pg from "pg";
const REF="gsqcyghmkgywrxitpiiv", PW=process.env.SUPA_PW, file=process.argv[2];
if(!PW){console.error("❌ SUPA_PW manquant");process.exit(1);}
if(!file||!fs.existsSync(file)){console.error("❌ fichier introuvable",file);process.exit(1);}
const sql=fs.readFileSync(file,"utf8");
const c=new pg.Client({host:"aws-0-eu-west-1.pooler.supabase.com",port:6543,user:`postgres.${REF}`,password:PW,database:"postgres",ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000});
await c.connect(); console.log("🔗 connecté 6543");
const res=await c.query(sql);
console.log("✅ appliqué:",file);
await c.end(); process.exit(0);

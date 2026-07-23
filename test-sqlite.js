const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');
db.serialize(() => {
  db.run("CREATE TABLE pm_assignments (pm_number TEXT UNIQUE, site_code TEXT)");
  db.run("INSERT INTO pm_assignments (pm_number, site_code) VALUES ('123', 'A')");
  db.run("INSERT INTO pm_assignments (pm_number, site_code) VALUES ('123', 'B') ON CONFLICT(pm_number) DO UPDATE SET site_code=coalesce('B', site_code)", function(err) {
    if (err) console.error("Error:", err.message);
    else console.log("Success!");
  });
});

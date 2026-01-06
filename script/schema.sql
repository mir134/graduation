-- 创建一个名为 schema.sql 的文件
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- wrangler d1 create graduation-db
-- wrangler d1 execute graduation-db --local --file=./script/schema.sql
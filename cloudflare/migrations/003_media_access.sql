CREATE TABLE media_access(hash TEXT PRIMARY KEY,asset_id TEXT NOT NULL REFERENCES assets(id),expires INTEGER NOT NULL);
CREATE INDEX media_access_expiry ON media_access(expires);

-- Small private assets share the free D1 database; no R2 subscription.
CREATE TABLE IF NOT EXISTS media_files (
 id TEXT PRIMARY KEY,
 size INTEGER NOT NULL CHECK(size > 0),
 mime TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media_chunks (
 file_id TEXT NOT NULL REFERENCES media_files(id),
 position INTEGER NOT NULL,
 bytes BLOB NOT NULL,
 PRIMARY KEY(file_id, position)
);

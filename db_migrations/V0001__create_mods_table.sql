CREATE TABLE IF NOT EXISTS mods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    prompt TEXT NOT NULL,
    version TEXT DEFAULT '1.0.0',
    minecraft_version TEXT DEFAULT '1.20.1',
    status TEXT DEFAULT 'generating',
    generated_code TEXT,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mods_created_at ON mods(created_at DESC);
CREATE INDEX idx_mods_status ON mods(status);
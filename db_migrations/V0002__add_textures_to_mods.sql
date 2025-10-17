ALTER TABLE mods ADD COLUMN IF NOT EXISTS textures_data TEXT;
ALTER TABLE mods ADD COLUMN IF NOT EXISTS texture_prompts TEXT;

CREATE INDEX IF NOT EXISTS idx_mods_textures ON mods(id) WHERE textures_data IS NOT NULL;
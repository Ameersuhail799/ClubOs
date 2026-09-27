-- ==============================================================================
-- ClubOS — Personal Todos: Add Optional Due Date
-- Allows members to set an optional deadline / due date for private scratchpad items.
-- ==============================================================================

ALTER TABLE personal_todos ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

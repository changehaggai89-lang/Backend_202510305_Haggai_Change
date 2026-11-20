const router = require("express").Router();
const { pool } = require("../db");

const STATUSES = ["Pending", "In progress", "Completed"];
const COLUMNS = "id, title, category, description, status";

// Checks the four editable fields. Returns { value } or { error }.
function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object." };
  }
  const fields = ["title", "category", "description", "status"];
  for (const field of fields) {
    if (typeof body[field] !== "string") {
      return { error: `${field} is required and must be text.` };
    }
  }
  const value = {
    title: body.title.trim(),
    category: body.category.trim(),
    description: body.description.trim(),
    status: body.status.trim()
  };
  if (value.title.length < 3 || value.title.length > 80) {
    return { error: "Title must have 3 to 80 characters." };
  }
  if (value.category.length < 2 || value.category.length > 40) {
    return { error: "Category must have 2 to 40 characters." };
  }
  if (value.description.length < 5 || value.description.length > 300) {
    return { error: "Description must have 5 to 300 characters." };
  }
  if (!STATUSES.includes(value.status)) {
    return { error: "Status must be Pending, In progress or Completed." };
  }
  return { value };
}

// Returns a positive whole number, or null if the id is invalid.
function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/records
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT ${COLUMNS} FROM records ORDER BY id`);
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/records/:id
router.get("/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ message: "Id must be a positive whole number." });
  try {
    const result = await pool.query(`SELECT ${COLUMNS} FROM records WHERE id = $1`, [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Record not found." });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/records
router.post("/", async (req, res, next) => {
  const { value, error } = validate(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const result = await pool.query(
      `INSERT INTO records (title, category, description, status)
       VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [value.title, value.category, value.description, value.status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/records/:id
router.put("/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ message: "Id must be a positive whole number." });
  const { value, error } = validate(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const result = await pool.query(
      `UPDATE records SET title = $1, category = $2, description = $3, status = $4
       WHERE id = $5 RETURNING ${COLUMNS}`,
      [value.title, value.category, value.description, value.status, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Record not found." });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/records/:id
router.delete("/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ message: "Id must be a positive whole number." });
  try {
    const result = await pool.query("DELETE FROM records WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Record not found." });
    res.status(200).json({ message: "Record deleted." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const pg = require("pg");
const express = require("express");
const morgan = require("morgan");

const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/the_acme_flavors_db"
);

const server = express();

const init = async () => {
  await client.connect();
  console.log("connected to database");

  // Create the flavors table
  let SQL = `DROP TABLE IF EXISTS flavors;
  CREATE TABLE flavors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
  );`;

  await client.query(SQL);
  console.log("table created");

  // Seed the table with some flavors
  SQL = `INSERT INTO flavors(name, is_favorite) VALUES('vanilla', true);
  INSERT INTO flavors(name, is_favorite) VALUES('chocolate', false);
  INSERT INTO flavors(name, is_favorite) VALUES('strawberry', true);
  INSERT INTO flavors(name, is_favorite) VALUES('cookie dough', true);
  INSERT INTO flavors(name, is_favorite) VALUES('rocky road', false);
  INSERT INTO flavors(name, is_favorite) VALUES('mint chocolate chip', false);`;

  await client.query(SQL);
  console.log("data seeded");

  // Middleware
  server.use(express.json());
  server.use(morgan("dev"));

  // Routes
  // GET /api/flavors - returns array of flavors
  server.get('/api/flavors', async (req, res) => {
    try {
      const result = await client.query('SELECT * FROM flavors');
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/flavors/:id - returns a single flavor
  server.get('/api/flavors/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await client.query('SELECT * FROM flavors WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Flavor not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/flavors - creates a new flavor
  server.post('/api/flavors', async (req, res) => {
    const { name, is_favorite } = req.body;
    try {
      const result = await client.query(
        'INSERT INTO flavors (name, is_favorite) VALUES ($1, $2) RETURNING *',
        [name, is_favorite]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/flavors/:id - deletes a flavor by ID
  server.delete('/api/flavors/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await client.query('DELETE FROM flavors WHERE id = $1', [id]);
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/flavors/:id - updates a flavor by ID
  server.put('/api/flavors/:id', async (req, res) => {
    const { id } = req.params;
    const { name, is_favorite } = req.body;
    try {
      const result = await client.query(
        'UPDATE flavors SET name = $1, is_favorite = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [name, is_favorite, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Flavor not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Have the server listen on a port
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`listening on port ${port}`));
};

init();

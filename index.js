const express = require('express');
const Pool = require('pg').Pool;
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: 'true' }));
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'db_test',
  password: 'postgres',
  port: 5432,
});

app.get('/api/models', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM models');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/models', async (req, res) => {
  const { name, description, context_length, tokenizer, modality } = req.body;
  try {
    await pool.query(
      'INSERT INTO models (name, description, context_length, tokenizer, modality) VALUES ($1, $2, $3, $4, $5)',
      [name, description, context_length, tokenizer, modality]
    );
    res.status(201).json({ message: 'Model added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/models/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM models WHERE id = $1', [
      id,
    ]);
    if (rows.length === 0) {
      res.status(404).json({ message: 'Model not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/models/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, context_length, tokenizer, modality } = req.body;
  try {
    await pool.query(
      'UPDATE models SET name = $1, description = $2, context_length = $3, tokenizer = $4, modality = $5 WHERE id = $6',
      [name, description, context_length, tokenizer, modality, id]
    );
    res.json({ message: 'Model updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/models/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM models WHERE id = $1', [id]);
    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Функция для сохранения данных в базу данных
async function saveDataToDatabase(models) {
  try {
    // Очищаем таблицу перед добавлением новых данных (если нужно)
    await pool.query('TRUNCATE TABLE models');

    // Добавляем каждую модель в базу данных
    for (const model of models) {
      await pool.query(
        'INSERT INTO models (id, name, description, context_length, tokenizer, modality) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          model.id,
          model.name,
          model.description,
          model.context_length,
          model.tokenizer,
          model.modality,
        ]
      );
    }
    console.log('Data saved to database successfully');
  } catch (error) {
    console.error('Error saving data to database:', error);
  }
}

// Запускаем cron задачу
cron.schedule('0 0 * * *', async () => {
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models');
    const models = response.data;

    // Сохраняем данные в базу данных
    await saveDataToDatabase(models);
  } catch (error) {
    console.error('Error fetching data from external API:', error);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

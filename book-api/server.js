const sqlite3 = require('sqlite3').verbose();

const express = require('express');
const app = express();
const PORT = 3000;

//connect to SQLite database
const db = new sqlite3.Database('./database.db', (err) =>
{
    if (err)
    {
        console.log("Error opening database:", err.message);
    }
    else
    {
        console.log("Connected to SQLite database");
    }
});

//create a new table if it doesn't already exist
db.run
(`
    CREATE TABLE IF NOT EXISTS books
    (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        year INTEGER,
        status TEXT NOT NULL
    )
`);

app.use(express.json());

//test route to make sure it's working
app.get('/', (req, res) => 
{
    res.send("Book API is running");
});

//get all books in database
app.get('/books', (req, res) => 
{
    console.log("GET /books HIT");
    const { status } =  req.query;
    let sql = "SELECT * FROM books";
    let params = [];

    if(status)
    {
        sql += " WHERE status = ?";
        params.push(status);
    }
    db.all(sql, params, (err, row) =>
    {
        if(err)
        {
            return res.status(500).json({error: err.message});
        }
        res.json({books: row});
    });
});

//get a single book by ID
app.get('/books/:id', (req, res) => 
{
    const id = req.params.id;
    const sql = "SELECT * FROM books WHERE id = ?";

    db.get(sql, [id], (err, row) =>
    {
        if(err)
        {
            return res.status(500).json({error: err.message});
        }

        if(!row)
        {
            return res.status(404).json({message : "Book not found"});
        }
        res.json({books: row});
    });  
});

//create a new book
app.post('/books', (req, res) => 
{
    const { title, author, year, status } = req.body;

    //validation for REQUIRED/NOT NULL fields
    if (!title || !author || !status) {
        return res.status(400).json({
            message: "title, author, and status are required"
        });
    }

    //declare and validate 3 options for status
    const allowedStatus = ["to-read", "reading", "completed"];

    if (!allowedStatus.includes(status)) {
        return res.status(400).json({
            message: "Invalid status value"
        });
    }

    const sql = `INSERT INTO books (title, author, year, status)
                VALUES (?, ?, ?, ?)`;

    db.run(sql, [title, author, year, status], function (err) 
    {
        if (err) 
        {
            return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
            message: "Book added successfully",
            bookId: this.lastID
        });
    });
});

//edit/update an existing book
app.put('/books/:id', (req, res) => 
{
    const id = req.params.id;
    const { title, year, status } = req.body;

    //status validation
    const allowedStatus = ["to-read", "reading", "completed"];
    if (status && !allowedStatus.includes(status)) 
    {
        return res.status(400).json({
            message: "Invalid status value"
        });
    }

    //COALSESCE - partial updates
    //use new value if it exists, otherwise use old value
    const sql = `
        UPDATE books
        SET title = COALESCE(?, title),
            year = COALESCE(?, year),
            status = COALESCE(?, status)
        WHERE id = ?
    `;

    db.run(sql, [title, year, status, id], function (err) 
    {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        //book doesn't exist so can't change/update
        if (this.changes === 0) 
        {
            return res.status(404).json({
                message: "Book not found"
            });
        }
        //success message
        res.json({
            message: "Book updated successfully"
        });
    });
});

//delete an existing book
app.delete('/books/:id', (req, res) => 
{
    const id = req.params.id;

    const sql = "DELETE FROM books WHERE id = ?";

    db.run(sql, [id], function (err) {
        if (err) 
        {
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) 
        {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.json({
            message: "Book deleted successfully"
        });
    });
});

//start server
app.listen(PORT, () =>
{
    console.log(`Server running on port ${PORT}`);
});
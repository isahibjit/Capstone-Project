import axios, { all } from "axios"
import express, { query, response } from "express"
import bodyParser from "body-parser"
import multer from "multer"
import pg from "pg"
import sharp from "sharp"
import { name } from "ejs"


const port = 3000
const app = express()

app.use(express.static("src"))
app.use(express.static("views"))

app.use(bodyParser.urlencoded({ extended: true }))

app.set("view engine", "ejs")

const db = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    password: '123456',
    database: 'Booknotes',
    port: 5432
})
db.connect()
let books = [];
let users = [];


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let currentUserId
try {
    currentUserId = (await getAllUsers())[0].id
} catch (error) {
    console.log("No User !")
}
console.log("This is the first user id", currentUserId)
app.get("/", async (req, res) => {
    console.log(req.query)
    try {
        const query = req.query.filter

        const notes = await getNotesByUserId(currentUserId,query)
        const allUsers = await getAllUsers()
        const image = await getImage()
        res.render("index.ejs", {
            image: image,
            users: allUsers,
            notes: notes
        })
    } catch (error) {
        console.log(error)
        //if no notes are present render something else 
    }

})

app.post("/fetchUser", (req, res) => {
    const userId = req.body.userId
    currentUserId = userId
    res.redirect("/")
})

app.get("/addUser", async (req, res) => {

    const image = await getImage()
    res.render("addUser.ejs", {
        image: image
    })
})
app.post("/addUser", upload.single('imageInput'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error("File not uploaded");
        }
        const userId = req.body.name
        const imgData = await sharp(req.file.buffer)
            .resize({ width: 200, height: 200 })
            .jpeg({ quality: 60 })
            .toBuffer()
        if (userId && imgData) {
            await addUserData(userId, imgData)
            console.log("Succesfully Added the User")
            res.redirect("/");
        }

    } catch (error) {
        console.error(error.message);
        res.status(400).send("Error uploading file. Please try again.");
    }
});

app.get("/notes/:id", async (req, res) => {
    try {
        console.log("This should be a bookId ID -> ",req.params.id)
        const bookId = req.params.id
        const note = await getNoteByBookId(currentUserId, bookId)
        const notes = (await getNotesByUserId(currentUserId))
        res.render("myNotes.ejs", {
            image: await getImage(),
            note:note,
            notes:notes
        })
    } catch (error) {
        res.render("myNotes.ejs", {
            image: await getImage()
        })
    }
   
})



app.get("/addNotes", async (req, res) => {


    res.render("addBook.ejs", {
        image: await getImage(),
        books: books.length > 0 ? books : false,
        success: req.query.success ? req.query.success : false,
        error: req.query.error ? req.query.error : false,
        notes:await getNotesByUserId(currentUserId)

    })


})
app.get('/fetchBooks', async (req, res) => {
    console.log(req.query)
    if (req.query.book) {
        const bookName = req.query.book.replace(/ /g, '+').toLowerCase()


        try {
            const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${bookName}`)
            const googleBooks = response.data
            const googleBookId = googleBooks.items[0].id
            const getImageUrl = `https://books.google.com/books/content?id=${googleBookId}&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api`
            if (googleBooks.items) {
                books = googleBooks.items.map(book => ({
                    GoogleBookId: book.id,
                    title: book.volumeInfo.title,
                    authorName: book.volumeInfo.authors ? book.volumeInfo.authors[0] : "Unknown Author",
                    ISBN: book.volumeInfo.industryIdentifiers ? book.volumeInfo.industryIdentifiers[0].identifier : "No ISBN Available"
                }));
            }


            res.redirect("/addNotes")
        } catch (error) {
            console.log(error)
            res.redirect("/addNotes")
        }
    }
    else {
        console.log("This got triggered ")
        res.redirect("/addNotes")
    }
})

app.post("/fetchBooks", async (req, res) => {
    let finalBook = []
    finalBook.push(req.body)

    // for adding notes into it
    const googleBookId = req.body.bookId
    const rating = req.body.rating
    const notes = req.body.notes
    const userId = (await getUserDataById()).id

    // for adding a book into the database with that corresponding userId
    const authorName = req.body.authorName
    // google book id
    const title = req.body.title
    const ISBN = req.body.ISBN


    try {
        const book_id = await insertBookDetails(authorName, googleBookId, title, ISBN, userId)
        await insertNotes(notes, rating, userId, book_id)
        console.log("Notes Succesfully Added !")
        books = []
        console.log("I got triggered!")
        res.redirect("/addNotes?success=true")
    } catch (error) {
        console.log(error)
        books = []
        res.redirect("/addNotes?error=false")
    }

})
app.get("/editUser", async (req, res) => {
    const allUsers = await getAllUsers()
    res.render("editUser.ejs", {
        image: await getImage(),
        users: allUsers,
        notes: await getNotesByUserId(currentUserId)
    })
})
app.post("/editUser", upload.single('imageInput'), async (req, res) => {
    try {
        if (req.body.userId && req.file) {
            const userId = req.body.userId;
            console.log(req.body);
            const imgData = await sharp(req.file.buffer)
                .resize({ width: 200, height: 200 })
                .jpeg({ quality: 60 })
                .toBuffer();
            
            await updateImg(userId, imgData);
            return res.redirect("/editUser");
        }
        
        if (req.body) {
            const allUsers = await getAllUsers();
            const userId = req.body.userId;
            const user = allUsers.find((user) => user.id == userId);
            console.log(user.name);
            const newName = req.body.newName;

            if (newName != user.name && newName != "") {
                await updateName(userId, newName);
                return res.redirect("/editUser")
            } else {
                console.log("Same User Id!");
                return res.redirect("/editUser");
            }
        }

        throw new Error("Image or name wasn't sent");
    } catch (error) {
        console.log(error);
        return res.status(500).send('An error occurred');
    }
});


app.post("/deleteUser", async (req, res) => {
    const userId = req.body.userId
    console.log(userId)
    try {
        await db.query('DELETE FROM "USER" WHERE id = $1 ', [userId])
        currentUserId = (await getAllUsers())[0].id
        res.redirect("/editUser")
    } catch (error) {
        console.log("An error Occurred : ", error)
    }
})

app.post("/editNotes", async(req,res)=>{
    try {
        const bookId = req.body.bookId
        const updatedNote = req.body.updatedNote
        console.log(bookId)
        if(updatedNote!= ""){
            await updateNote(bookId,updatedNote)
            console.log("Notes are updated successfully!")
 
        }
        else{
            throw new Error("Can't submit an empty note")
        }
    } catch (error) {
        console.log(error)
    }
    res.redirect(`/notes/${req.body.bookId}`)
})

async function addUserData(userId, imgData) {
    try {
        const result = await db.query('INSERT INTO "USER"(name, profile_picture) VALUES($1,$2) RETURNING ID', [userId, imgData])
        currentUserId = result.rows[0].id
    } catch (error) {
        console.log("Error Occured : ", error)
    }
}
async function getUserDataById() {
    const result = await db.query('SELECT * FROM "USER" WHERE ID = $1', [currentUserId])
    return result.rows[0]
}



async function getImage() {
    try {
        const user = await getUserDataById()

        if (user) {
            const binaryData = user.profile_picture
            const base64Image = binaryData.toString('base64')
            return base64Image
        }
    } catch (error) {
        console.log("Error Occured", error)
    }
}
async function getAllUsers() {
    try {
        const result = (await db.query('SELECT * FROM "USER" ORDER BY id ASC')).rows
        const usersWithBase64 = result.map(user => {
            if (user.profile_picture) {
                const binaryData = user.profile_picture
                const base64Image = binaryData.toString('base64')
                return { ...user, profile_picture: base64Image }
            }
            else throw new Error(`No Profile Picture found for User ID ${user.id}`)
        })
        return usersWithBase64
    } catch (error) {
        console.log("Error Occurred : ", error)

    }
}

async function updateImg(userId, imgData) {
    try {
        await db.query('UPDATE "USER" SET profile_picture = $1 WHERE id = $2', [imgData, userId])
    } catch (error) {
        console.log(error)
    }
}
async function updateName(userId, newName) {
    try {
        await db.query('UPDATE "USER" SET name = $1 WHERE id = $2', [newName, userId])
    } catch (error) {
        console.log(error)
    }
}

async function insertBookDetails(authorName, googleBookId, title, ISBN, userId) {
    try {
        const result = await db.query('INSERT INTO book (author_name,google_bookid,title,isbn,user_id) VALUES ($1,$2,$3,$4,$5) RETURNING id', [authorName, googleBookId, title, ISBN, userId])
        const book_id = result.rows[0].id

        return book_id
    } catch (error) {
        console.log(error)
        throw error
    }
}

async function insertNotes(notes, rating, userId, book_id) {
    try {
        await db.query("INSERT INTO notes(notes_text,rating,user_id, book_id) VALUES($1,$2,$3,$4)", [notes, rating, userId, book_id])
    } catch (error) {
        console.log(error)
    }
}

async function getNotesByUserId(currentUserId,query) {
    try {
        let userQuery = query ? query:"notes.user_id"
        let pgQuery = `SELECT notes.user_id, google_bookid, book_id, title, notes_text, created_at, rating, ISBN FROM  NOTES INNER JOIN book ON notes.book_id = book.id WHERE notes.user_id = $1 `
        if(userQuery.toLowerCase()=="best"){
            pgQuery += 'AND RATING > 3 '
            userQuery = "notes.user_id"
        }
        const result = await db.query(pgQuery+`ORDER BY ${userQuery}`, [currentUserId])
        return result.rows
    } catch (error) {
        console.log("Error", error)
        throw error
    }
}

async function getNoteByBookId(currentUserId, bookId) {
    try {
        const result = await db.query('SELECT book.id, name, google_bookId, title, ISBN, created_at, rating, notes_text FROM notes INNER JOIN "USER" ON notes.user_id = "USER".id INNER JOIN book ON notes.book_id = book.id WHERE "USER".id = $1 AND book.id = $2', [currentUserId, bookId]);
        
        return result.rows[0]
    } catch (error) {
        console.log(error)
    }
}

async function updateNote(bookId,updatedNote){
    try {
        await db.query("UPDATE notes SET notes_text = $1 WHERE book_id = $2",[updatedNote,bookId])
    } catch (error) {
        console.log(error)
    }
}
app.listen(port, () => {
    console.log(`Server Started Listening on Port ${port}`)
})
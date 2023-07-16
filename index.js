require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

const cors = require("cors");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7cgfs.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    const db = client.db("tech-net");
    const bookCollection = db.collection("book");
    const userCollection = db.collection("user");
    app.get("/books", async (req, res) => {
      const cursor = bookCollection.find({}).sort({ _id: -1 });
      const book = await cursor.toArray();
      res.send({ status: true, data: book });
    });

    app.post("/book", async (req, res) => {
      const book = req.body;
      const result = await bookCollection.insertOne(book);
      res.send(result);
    });

    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookCollection.findOne({ _id: ObjectId(id) });
      res.send(result);
    });

    app.delete("/book/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookCollection.deleteOne({ _id: ObjectId(id) });
      res.send(result);
    });

    app.patch("/book/:id", async (req, res) => {
      const id = req.params.id;
      const updates = req.body;

      try {
        const result = await bookCollection.updateOne(
          { _id: ObjectId(id) },
          { $set: updates }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Book not found" });
        }

        res.send({ message: "Book updated successfully" });
      } catch (error) {
        console.error("Error updating book:", error);
        res.status(500).send({ message: "Failed to update book" });
      }
    });

    app.post("/comment/:id", async (req, res) => {
      const commentId = req.params.id;
      const comment = req.body.comment;
      const result = await bookCollection.updateOne(
        { _id: ObjectId(commentId) },
        { $push: { comments: comment } }
      );

      if (result.modifiedCount !== 1) {
        console.error("Product not found or comment not added");
        res.json({ error: "Product not found or comment not added" });
        return;
      }

      console.log("Comment added successfully");
      res.json({ message: "Comment added successfully" });
    });

    app.get("/comment/:id", async (req, res) => {
      const commentId = req.params.id;

      const result = await bookCollection.findOne(
        { _id: ObjectId(commentId) },
        { projection: { _id: 0, comments: 1 } }
      );

      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "Product not found" });
      }
    });

    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.post("/wishlist", async (req, res) => {
      const userEmail = req.body.email;
      const bookTitle = req.body.bookTitle;

      try {
        // Find the user in the database
        const user = await userCollection.findOne({ email: userEmail });

        if (!user) {
          console.error("User not found");
          res.status(404).json({ error: "User not found" });
          return;
        }

        // Update the wishlist
        const updatedWishlist = user.wishlist || [];
        updatedWishlist.push(bookTitle);

        const result = await userCollection.updateOne(
          { email: userEmail },
          { $set: { wishlist: updatedWishlist } }
        );

        if (result.modifiedCount !== 1) {
          console.error("Book not added to wishlist");
          res.status(500).json({ error: "Book not added to wishlist" });
          return;
        }

        console.log("Book added to wishlist");
        res.json({ message: "Book added to wishlist" });
      } catch (err) {
        console.error("Error adding book to wishlist:", err);
        res.status(500).json({ error: "Error adding book to wishlist" });
      }
    });

    // my list

    app.post("/myList", async (req, res) => {
      const userEmail = req.body.email;
      const bookTitle = req.body.bookTitle;
      const status = req.body.status; // 'reading' or 'read-soon'

      try {
        // Find the user in the database
        const user = await userCollection.findOne({ email: userEmail });

        if (!user) {
          console.error("User not found");
          res.status(404).json({ error: "User not found" });
          return;
        }

        let myList = user.myList || [];
        myList.push({ _id: new ObjectId(), title: bookTitle, status });

        const result = await userCollection.updateOne(
          { email: userEmail },
          { $set: { myList } }
        );

        if (result.modifiedCount !== 1) {
          console.error("Book not added to the list");
          res.status(500).json({ error: "Book not added to the list" });
          return;
        }

        console.log("Book added to the list");
        res.json({ message: "Book added to the list" });
      } catch (err) {
        console.error("Error adding book to the list:", err);
        res.status(500).json({ error: "Error adding book to the list" });
      }
    });

    // update my list 

    app.patch('/myList/:email/:bookId', async (req, res) => {
      const userEmail = req.params.email;
      const bookId = req.params.bookId;
    
      try {
        const user = await userCollection.findOne({ email: userEmail });
    
        if (!user) {
          console.error('User not found');
          res.status(404).json({ error: 'User not found' });
          return;
        }
    
        const myList = user.myList || [];
        const updatedList = myList.map((book) => {
          if (book._id.toString() === bookId) {
            return { ...book, status: 'finished reading' };
          }
          return book;
        });
    
        const result = await userCollection.updateOne(
          { email: userEmail },
          { $set: { myList: updatedList } }
        );
    
        if (result.modifiedCount !== 1) {
          console.error('Failed to update book status');
          res.status(500).json({ error: 'Failed to update book status' });
          return;
        }
    
        console.log('Book status updated');
        res.json({ message: 'Book status updated' });
      } catch (err) {
        console.error('Error updating book status:', err);
        res.status(500).json({ error: 'Error updating book status' });
      }
    });
    
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });

      if (result?.email) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });
  } finally {
  }
};

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

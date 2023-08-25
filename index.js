import dotenv from 'dotenv'
dotenv.config();

import express, { json } from 'express';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
const app = express();
const port = process.env.PORT || 5000;

import cors from 'cors';

app.use(cors());
app.use(json());

const uri = process.env.DB_URL
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    const db = client.db('book-catalog');
    const productCollection = db.collection('products');
    const wishlistCollection = db.collection('wishlist')
    const ReadingListCollection = db.collection('readinglist')

    app.get('/products', async (req, res) => {
      const filter = {}
      const andConditions = []
      const { Genre, Year, searchTerm } = req.query
      console.log(req.query)


      if (Year || Genre) {
        andConditions.push({
          $and: [
            Year && {
              PublicationDate: { $regex: Year, $options: 'i' },

            } || {},
            Genre && {
              Genre: { $regex: Genre, $options: 'i' }
            } || {}
          ]
        });
      }




      if (searchTerm) {
        andConditions.push({
          $or: [
            {
              Title: { $regex: searchTerm, $options: 'i' },
            }, {
              Author: { $regex: searchTerm, $options: 'i' },
            }, {
              Genre: { $regex: searchTerm, $options: 'i' }
            }
          ]




        })

      }
      console.log(JSON.stringify(andConditions))
      const whereConditions = andConditions.length > 0 ? { $and: andConditions } : {};
      const cursor = productCollection.find(whereConditions);
      const product = await cursor.toArray();

      res.send({ status: true, data: product });
    });

    app.post('/product', async (req, res) => {
      const product = req.body;

      const result = await productCollection.insertOne(product);

      res.send(result);
    });

    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;

      const result = await productCollection.findOne({ _id: new ObjectId(id) });
      console.log(result);
      res.send(result);
    });

    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;

      const result = await productCollection.deleteOne({ _id: new ObjectId(id) });
      console.log(result);
      res.send(result);
    });

    app.post('/review/:id', async (req, res) => {
      const productId = req.params.id;
      const review = req.body.review;
      console.log(review)
      console.log(productId);


      const result = await productCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $push: { Reviews: review } }
      );



      if (result.modifiedCount !== 1) {
        console.error('Product not found or comment not added');
        res.json({ error: 'Product not found or comment not added' });
        return;
      }

      console.log('Comment added successfully');
      res.json({ message: 'Comment added successfully' });
    });

    // edit 
    app.put('/edit/:id', async (req, res) => {
      const productId = req.params.id;
      const { Title, Author, Genre, PublicationDate } = req.body;

      try {
        const result = await productCollection.updateMany(
          { _id: new ObjectId(productId) },
          { $set: { Title, Author, Genre, PublicationDate } }
        );

        if (result.modifiedCount !== 1) {
          console.error('Product not found or not updated');
          res.status(404).json({ error: 'Product not found or not updated' });
          return;
        }

        console.log('Product updated successfully');
        res.json({ message: 'Product updated successfully' });
      } catch (error) {
        console.error('Error occurred while updating product', error);
        res.status(500).json({ error: 'Error occurred while updating product' });
      }
    });

    // wishlist 
    app.post('/wishlist', async (req, res) => {
      const data = req.body;
      const { _id, ...newdata } = data
      const wishlistStatus = true;
      const id = _id;
      const product = { wishlistStatus, id, newdata };

      try {
        // Check if the id already exists in the collection
        const existingProduct = await wishlistCollection.findOne({ id });
        if (existingProduct) {
          return res.status(400).json({ error: 'Duplicate entry' });
        }

        const result = await wishlistCollection.insertOne(product);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/wishlist', async (req, res) => {
      const email = req.query.email
      const result = await wishlistCollection.find({ "newdata.email": email }).toArray()
      res.send(result)
    })
    // wishlist 
    app.post('/reading', async (req, res) => {
      const data = req.body;
      const { _id, ...newdata } = data
      const readingStatus = false;
      const id = _id;
      const product = { readingStatus, id, newdata };

      try {
        // Check if the id already exists in the collection
        const existingProduct = await ReadingListCollection.findOne({ id });
        if (existingProduct) {
          return res.status(400).json({ error: 'Duplicate entry' });
        }

        const result = await ReadingListCollection.insertOne(product);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/reading', async (req, res) => {
      const email = req.query.email;
      console.log(req.params)
      console.log(req.query);
      const result = await ReadingListCollection.find({ "newdata.email": email }).toArray();
      res.send(result);
    });


    app.patch('/updateRead/:id', async (req, res) => {
      const id = req.params.id;

      try {
        // Find the document in the ReadingListCollection by ID and update the readingStatus field
        const updatedDoc = await ReadingListCollection.updateOne(
          { _id: new ObjectId(id) }, // Filter object
          { $set: { readingStatus: true } } // Update object
        );

        if (!updatedDoc) {
          return res.status(404).json({ message: 'Document not found' });
        }

        res.json(updatedDoc);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
      }
    });





  } finally {
  }
};

run().catch((err) => console.log(err));

app.get('/', (req, res) => {
  res.send('Server Working....');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
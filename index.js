const express = require('express');
const cors = require('cors');
require('dotenv').config();
const multer  = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'))
app.use('/modelingImg', express.static('modelingImg'))


// MongoDb _______________

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@rgfdatabase.rxibuy1.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });


async function run(){
    try {
        // Contact Us Using NodeMailer Start___________________________________
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
              // TODO: replace `user` and `pass` values from <https://forwardemail.net>
              user: process.env.MY_EMAIL,
              pass: process.env.MY_EMAIL_PASS,
            },
          });
        app.post('/mainContactForm', async (req, res) => {
            const info = await transporter.sendMail({
                from: req.body.email, // sender address
                to: process.env.MY_EMAIL, // list of receivers
                subject:req.body.subject, // Subject line
                text: req.body.message, // plain text body
                html: `<p><b>You Got New Message from ${req.body.yourName}<b/></p>
                        <h5>Name: ${req.body.yourName}</h5>
                        <h5>Email: ${req.body.yourEmail}</h5>
                        <p>Message${req.body.message}</p>`, // html body
              });
        })
        

        // Contact Us Using NodeMailer End_____________________________________





        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const productsCatelog = client.db("RGFDatabase").collection("Products");
        const modelingImages = client.db("RGFDatabase").collection("modelingImages");



        // Image Upload Using Multer ________________
        const storage = multer.diskStorage({ 
            destination: 'uploads/',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
               cb(null, uniqueSuffix + '-' + file.originalname)
            },
            fileFilter: (req, file, cb) =>{
                const supportedImage = /png|jpg|jpeg|webp/;
                const extension = path.extname(file.originalname);
                if(supportedImage.test(extension)){
                    cb(null, true)
                }else{
                    cb(new Error('Must be a png/jpg image'))
                }
             }
         });
        
        const upload = multer({storage})
        
        let imagePath;
        app.post('/productImage', upload.single('file'), (req, res) => {
            imagePath =req.file
            res.send({success: true, imagePath});
          })

        // Delete Image ___________
        app.delete('/productImageDelete/:parems', (req, res) => {
            const fileName = req.params.parems;
            console.log('Request From Client Site', fileName)
            fs.unlink('uploads/' + fileName, (err) => {
                if (err) {
                    console.log("Dlete Error", err)
                }else{
                    console.log("Delete File successfully.");
                    res.send({success: true})
                }
                
            });
        }) 



        // Modeling Image Storage _________________________________________________________
        const storageA = multer.diskStorage({ 
            destination: 'modelingImg/',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
               cb(null, uniqueSuffix + '-' + file.originalname)
            },
            fileFilter: (req, file, cb) =>{
                const supportedImage = /png|jpg|jpeg|webp/;
                const extension = path.extname(file.originalname);
                if(supportedImage.test(extension)){
                    cb(null, true)
                }else{
                    cb(new Error('Must be a png|jpg|jpeg|webp image'))
                }
             }
         });
        
        const modelingImg = multer({storage: storageA})
        
        let imageLink;
        app.post('/modelingImg', modelingImg.array('files'), (req, res) => {
            const data = req.files
            res.send(data);
          })

        // Delete Image ___________
        app.delete('/modelingImg/:parems', (req, res) => {
            const fileName = req.params.parems;
            console.log('Request From Client Site', fileName)
            fs.unlink('modelingImg/' + fileName, (err) => {
                if (err) {
                    console.log("Dlete Error", err)
                }else{
                    console.log("Delete File successfully.");
                    res.send({success: true})
                }
                
            });
        }) 


        // End Multer ______________________________________________________

        // RGF Endpoint API ________________________________________________
        app.post('/products', async (req, res) =>{
            const product = req.body;
            const result = await productsCatelog.insertOne(product);
            res.send({success: true, result});
        })
        // Get All Product ____________________________________
        app.get('/products', async(req, res) => {
            const query ={};
            const cursor = productsCatelog.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        //Get single Product  Data from server____________________________________________
        app.get('/products/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id) };
            const singleData = await productsCatelog.findOne(query);
            res.send(singleData);
        })


        //Delete single Product  Data from server____________________________________________
        app.delete('/products/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id) };
            const singleData = await productsCatelog.deleteOne(query);
            res.send(singleData);
        })

        // Update Product _______________________________________________________________
        app.put('/products/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id)};
            const option = {upsert: true};
            console.log(req.body)
            if(req.body.category == 'Shop Turf'){
                let updateDocument = {
                    $set: {
                     ProductTitle: req.body.ProductTitle,
                     ProductDescription: req.body.ProductDescription,
                     category: req.body.category,
                     subCategory: req.body.subCategory,
                     fileName: req.body.fileName,
                     img: req.body.img,
                     YarnType: req.body.YarnType,
                     Weight: req.body.Weight,
                     SecondaryBacking: req.body.SecondaryBacking,
                     Pile_Height: req.body.Pile_Height,
                     RollWidth: req.body.RollWidth,
                     Perforated: req.body.Perforated,
                     Color: req.body.Color,
                     PDFSpecSheet: req.body.PDFSpecSheet,
                    },
                 };
                 const result = await productsCatelog.updateOne(filter, updateDocument, option);
                    res.send({success: true, result})
            }else if(req.body.category == 'Shop Plants'){
                let updateDocument = {
                    $set: {
                     ProductTitle: req.body.ProductTitle,
                     ProductDescription: req.body.ProductDescription,
                     category: req.body.category,
                     subCategory: req.body.subCategory,
                     fileName: req.body.fileName,
                     img: req.body.img,
                     Product_Code: req.body.Product_Code,
                     UPC: req.body.UPC,
                     ItemsPerPack: req.body.ItemsPerPack,
                     DominantColor: req.body.DominantColor,
                     PottedOrBaseIncluded: req.body.PottedOrBaseIncluded,
                     WeightOfEachItem: req.body.WeightOfEachItem,
                     WeightOf1pack: req.body.WeightOf1pack,
                     ShippingBoxSize: req.body.ShippingBoxSize,
                     ShippingDimensionalWeight: req.body.ShippingDimensionalWeight,
                     OversizedFreightShipping: req.body.OversizedFreightShipping,
                    },
                 };
                 const result = await productsCatelog.updateOne(filter, updateDocument, option);
                 res.send({success: true, result})
            }
          })




        // Products category Data from Server ______________________________________________
        app.get('/shopTurf', async(req, res) => {
            const name = 'Shop Turf'
            const query ={category: name};
            const cursor = await productsCatelog.find(query).toArray();
            console.log(cursor)
            res.send(cursor);
        });
        app.get('/shopPlants', async(req, res) => {
            const name = 'Shop Plants'
            const query ={category: name};
            const cursor = await productsCatelog.find(query).toArray();
            console.log(cursor)
            res.send(cursor);
        });


        // Modeling Page Api ___________________
        app.post('/modelingImageApi', async (req, res) => {
            const docs = req.body
            const options = { ordered: true };
            const result = await modelingImages.insertMany(docs, options);
            console.log(req.body)
            res.send({success: true, result});
        })
        app.get('/modelingImageApi', async (req, res) => {
            const query ={};
            const cursor = modelingImages.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })
        app.delete('/modelingImageApi/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = {_id: new ObjectId(id) };
            const singleData = await modelingImages.deleteOne(query);
            res.send({success: true});
        })








        
    } finally{
        
    }
}

run().catch(console.dir)











// Backend Bottom Part ____________________
app.get('/', (req, res) => {
    res.send('Backend Running');
});

app.listen(port, () => {
    console.log('Backend Console', port , process.env.DB_USER, process.env.DB_PASS)
})

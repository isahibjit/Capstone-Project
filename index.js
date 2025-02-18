import express from "express";
import bodyParser from "body-parser";
import axios from "axios"


const port = 3000;
const app = express();
let API_URL = "https://v2.jokeapi.dev/joke/Any"


app.set('view engine', 'ejs'); // Set EJS as the template engine
app.set('views', './views'); // Specify the views directory


app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static("public")); // Make sure to serve the 'public' directory


function buildApi(req) {
    let firstParam = true;

    let flagParam = true

    let qParam = true



    if (req.body.genre && typeof req.body.genre=== "object") {
        req.body.genre.forEach(genre => {
            if (firstParam) {
                API_URL += "/" + genre
                firstParam = false
            }
            else {
                API_URL += "," + genre
            }
        });
        console.log(API_URL)
    }

    if (req.body.language) {
        if (qParam) {
            API_URL += "?lang=" + req.body.language
            qParam = false
        }
    }

    if (req.body.blacklist) {
        req.body.blacklist.forEach(item => {
            if (qParam) {
                if (flagParam) {
                    API_URL += "?blacklistFlags=" + item
                    flagParam = false
                }
                else {
                    API_URL += "," + item
                }
            }
            else {
                if (flagParam) {
                    API_URL += "&blacklistFlags=" + item
                    flagParam = false
                }
                else {
                    API_URL += "," + item
                }
            }
        })
    }
}
app.use((req,res,next)=>{
    API_URL = "https://v2.jokeapi.dev/joke/Any"
    buildApi(req)
    next()
})

app.listen(port, () => {
    console.log("The Server is started on port " + port);
});

app.get("/", async (req, res) => {
    
    // console.log(response.data)
    res.render("index.ejs");
});
app.get("/aboutUs",(req,res)=>{
    res.render("aboutUs.ejs")

})
app.get("/contactUs",(req,res)=>{
    res.render("contactUs.ejs")

})
app.get("/service",(req,res)=>{
    res.render("service.ejs")

})

app.post("/submit", async (req, res) => {
 
    const response = await axios.get(API_URL)
    console.log(response.data.setup)
    console.log(response.data.delivery)

    res.render("index.ejs",{
        content:response.data,
        setup:response.data.setup,
        delivery:response.data.delivery,
        joke:response.data.joke
    })
})

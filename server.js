import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const usage = {};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
});


function checkLimit(id) {
  if (!usage[id]) {
    usage[id] = {
      count: 0,
      date: new Date().toDateString()
    };
  }

  if (usage[id].date !== new Date().toDateString()) {
    usage[id] = {
      count: 0,
      date: new Date().toDateString()
    };
  }

  if (usage[id].count >= 30) {
    return false;
  }

  usage[id].count++;
  return true;
}


function needsWeb(text) {

  const words = [
    "latest",
    "today",
    "news",
    "current",
    "price",
    "update",
    "score",
    "weather",
    "recent",
    "2026"
  ];

  return words.some(word =>
    text.toLowerCase().includes(word)
  );
}



async function searchWeb(query) {

  // Parallel integration point
  // We will connect the exact endpoint here

  if (!process.env.PARALLEL_API_KEY) {
    return [];
  }


  try {

    const response = await fetch(
      "https://api.parallel.ai/v1/search",
      {
        method:"POST",
        headers:{
          "Authorization":
            `Bearer ${process.env.PARALLEL_API_KEY}`,
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          query: query,
          max_results: 5
        })
      }
    );


    const data = await response.json();


    return data.results || [];


  } catch(error){

    console.log("Parallel error:", error);

    return [];

  }
}




async function askGemini(message, sources = []) {

  let context = "";

  if (sources.length > 0) {

    context =
    "\nUse these web sources when answering:\n" +
    JSON.stringify(sources);

  }


  const result =
    await model.generateContent(
      message + context
    );


  return result.response.text();

}




app.get("/", (req,res)=>{

  res.json({
    name:"Nova Core",
    version:"0.6.1",
    status:"online"
  });

});





app.post("/chat", async(req,res)=>{

  try {

    const {
      message,
      userId="guest"
    } = req.body;


    if(!message){

      return res.status(400).json({
        error:"Missing message"
      });

    }



    if(!checkLimit(userId)){

      return res.json({

        error:"Free limit reached",

        upgrade:true

      });

    }



    let sources = [];


    if(needsWeb(message)){

      sources =
        await searchWeb(message);

    }



    const answer =
      await askGemini(
        message,
        sources
      );



    res.json({

      answer,

      sources,

      remaining:
        30 - usage[userId].count

    });



  } catch(error){

    console.error(error);

    res.status(500).json({

      error:"Nova Core failed"

    });

  }


});





app.listen(
  process.env.PORT || 3000,
  ()=>{
    console.log("Nova Core online");
  }
);

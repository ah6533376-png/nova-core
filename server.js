import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const usage = {};

function checkLimit(id){
  if(!usage[id]) usage[id]={count:0,date:new Date().toDateString()};
  if(usage[id].date !== new Date().toDateString())
    usage[id]={count:0,date:new Date().toDateString()};
  if(usage[id].count >= 30) return false;
  usage[id].count++;
  return true;
}

function needsWeb(text){
 return ["latest","today","news","current","price","update","score","weather"]
 .some(x=>text.toLowerCase().includes(x));
}

app.get("/",(req,res)=>res.json({name:"Nova Core",version:"0.6.0"}));

app.post("/chat",(req,res)=>{
 const {message,userId="guest"}=req.body;
 if(!checkLimit(userId))
   return res.json({error:"Free limit reached",upgrade:true});

 res.json({
   answer: needsWeb(message)
    ? "Live search pipeline detected. Parallel integration point ready."
    : "AI routing point ready.",
   sources: [],
   remaining: 30-usage[userId].count
 });
});

app.listen(process.env.PORT||3000,()=>console.log("Nova Core online"));

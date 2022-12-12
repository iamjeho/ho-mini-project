const express = require("express"); //인터넷 서버 라이브러리
const path = require("path") // pat라이브러리 import
const bodyParser = require("body-parser")

const app = express();

const PORT = 3000;
const HOST = "0.0.0.0" //들어오는 모든 주소를 다 읽겠다는 뜻

app.use(express.static(path.join(__dirname, "views")))//static설정값을 use함수를 이용하여 씀
//dirname은 현재 폴더임. 뒤는 views폴더도 보라는 뜻
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))

app.get("/action1", (req, res) =>{

    const id = req.body.id
    const color = req.body.color
    const size = req.body.size
    const owner = req.body.owner
    const Appraisevalue = req.body.Appraisedvalue


    console.log(id, color)

    //res.sendFile(__dirname + "/views/test.html")

    //BN접속
    //mychannel 접속
    //miniCC 체인코드 가져오기
    //CreateAsset 체인코드 함수 호출
    //결과 => web client 에게 reponse 전달
    
    const res_str = '{"result":"created", "msg":"success to create asset!"}'
    res.json(JSON.parse(res_str))
})

app.post("/createAsset", (req, res)=>{
    console.log("in createAsset")
})

app .listen(PORT, HOST);//port, host주소 각각 써주면 됨

console.log('Running on http://${Host}:${PORT}')

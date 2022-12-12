const express = require('express');
const app = express();

// 패브릭연결설정
const fs = require('fs');
const path = require('path');
const ccpPath = path.resolve(__dirname, "ccp", "connection-org1.json");//ca정보들이 json에 저장되어있음
const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));// utf8로 코딩해서 ccp에 저장후 밑 함수에서 사용
const FabricCAServices = require("fabric-ca-client");
const { Gateway, Wallets } = require("fabric-network");

// 서버설정
const PORT = 8000;
const HOST = '0.0.0.0';

// use static file
app.use(express.static(path.join(__dirname, 'views')));

// configure app to use body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// / GET index.html 페이지 라우팅
app.get('/', (req, res)=>{
    res.sendFile(__dirname + 'views/index.html');
})


async function submit(args, res) {
    try {
        // load the network configuration
        const ccpPath = path.resolve(__dirname, "ccp", "connection-org1.json");//ca정보들이 json에 저장되어있음
        const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));// utf8로 코딩해서 ccp에 저장후 밑 함수에서 사용

        // Create a new CA client for interacting with the CA.
        const caInfo = ccp.certificateAuthorities["ca.org1.example.com"];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(
            caInfo.url,
            { trustedRoots: caTLSCACerts, verify: false },
            caInfo.caName
        );//ca에 접속하기 위한 정보들

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the admin user.
        const identity = await wallet.get("admin");
        if (identity) {
            console.log(
                'An identity for the admin user "admin" already exists in the wallet'
            );
            return;
        }

        // Enroll the admin user, and import the new identity into the wallet.
        const enrollment = await ca.enroll({//enroll함수로 ca접속
            enrollmentID: "admin",
            enrollmentSecret: "adminpw",
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(), //private key
            },
            mspId: "Org1MSP",
            type: "X.509", //표준
        };
        await wallet.put("admin", x509Identity);
        console.log(
            'Successfully enrolled admin user "admin" and imported it into the wallet'
        );  

        const userIdentity = await wallet.get("appuser22");
        if (userIdentity) {
            console.log(
                'An identity for the user "appuser22" already exists in the wallet'
            );
            return;
        }

        // Check to see if we've already enrolled the admin user.
        const adminIdentity = await wallet.get("admin");
        if (!adminIdentity) {
            console.log(
                'An identity for the admin user "admin" does not exist in the wallet'
            );
            console.log("Run the enrollAdmin.js application before retrying");
            return;
        }

        // build a user object for authenticating with the CA
        const provider = wallet
            .getProviderRegistry()
            .getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, "admin");

        // Register the user, enroll the user, and import the new identity into the wallet.
        const secret = await ca.register( //인증서 발급 요청 -> 이 함수는 발급받기위한 정보 등록
            {
                affiliation: "org1.department1", // 소속기관
                enrollmentID: "appuser22",
                role: "client",
            },
            adminUser //register를 adminUser로 발급 
        );

        const cenrollment = await ca.enroll({ // 발급 register를 했으므로 발급 가능
            enrollmentID: "appuser22",
            enrollmentSecret: secret,
        });
        const cx509Identity = {
            credentials: {
                certificate: cenrollment.certificate,
                privateKey: cenrollment.key.toBytes(),
            },
            mspId: "Org1MSP",
            type: "X.509",
        };
        await wallet.put("appuser22", cx509Identity);
        console.log(
            'Successfully registered and enrolled admin user "appuser22" and imported it into the wallet'
        );
                // Check to see if we've already enrolled the user.
        const identity_user = await wallet.get("appuser22");
        if (!identity_user) {
            console.log(
                'An identity for the user "appuser22" does not exist in the wallet'
            );
            console.log("Run the registerUser.js application before retrying");
            return;
        }
        else{
            console.log("success!!");
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "appuser22",
            discovery: { enabled: true, asLocalhost: true },
        });

               // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork("mychannel");

// Get the contract from the network.
        const contract = network.getContract("basic");

        await contract.submitTransaction('CreateAsset', args[0], args[1], args[2]);

        console.log("Transaction has been submitted");
        // Disconnect from the gateway.
    } catch (error) {
        console.error(`Failed to enroll admin user "admin": ${error}`);
        process.exit(1);
    }
}


// REST API 라우팅
// /draw  POST  라우팅 -> 추첨이벤트 등록
//pid, pname, pmanager,pparam {"Args":["register","D101", "summer event", "MGR1", "3"]}
app.post('/vote', async(req, res)=>{
    
    // POST method 인경우 변수가 문서 body영역에 담겨서 전달
    const candidate = req.body.candidate;
    const location = req.body.location;
    const time = req.body.time;
        // (TO DO) 오류체크 -> 각 변수가 주어진 형식에 맞게 전달되었는지?
        

    submit([candidate, location, time])
    
    const status = {result: "success"}
    res.status(200).json(status) 
})

// 서버시작
app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
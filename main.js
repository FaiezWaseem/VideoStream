function copy(text) {
  var input = document.createElement('textarea');
  input.innerHTML = text;
  document.body.appendChild(input);
  input.select();
  var resultCopy = document.execCommand("copy");
  document.body.removeChild(input);
  return resultCopy;
}
//Create an account on Firebase, and use the credentials they give you in place of the following
var firebaseConfig = {
    apiKey: "AIzaSyBhQKzVqS9XnwF68ormlnELFRrOoYJ83vw",
    authDomain: "code-c75ca.firebaseapp.com",
    databaseURL: "https://code-c75ca.firebaseio.com",
    projectId: "code-c75ca",
    storageBucket: "code-c75ca.appspot.com",
    messagingSenderId: "706956688056",
    appId: "1:706956688056:web:c6f46e27db5963562dd24d",
    measurementId: "G-KP95XQ99M3"
  };
  firebase.initializeApp(firebaseConfig);
  var firestore = firebase.firestore();

const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  //Global State 
  var pc = new RTCPeerConnection(servers);
  
  let mystream = null;
  let Otherstream = null;



// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');
const copytext = document.getElementById('copytext');

webcamButton.onclick =  async () =>{
    // Accessing my video from camera
    mystream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    // user other stream
    Otherstream = new MediaStream();

  // Pushing my video to peer connection  (pushing my video to server)
  mystream.getTracks().forEach((track) => {
    pc.addTrack(track, mystream);
  });


    // Pulling other video  from remote stream, add to video stream
    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            Otherstream.addTrack(track);
        });
}

//Displaying my video 
webcamVideo.srcObject = mystream;
//Displaying Other video
remoteVideo.srcObject = Otherstream;

callButton.disabled = false;
answerButton.disabled = false;
webcamButton.disabled = true;
webcamButton.style.display = "none"
callButton.style.display = "block"
callInput.style.display = "block"
answerButton.style.display = "block"

}

// 2. Create an offer
callButton.onclick = async () => {
    // Reference Firestore collections for signaling
    const callDoc = firestore.collection('calls').doc();
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');
  
    callInput.value = callDoc.id;
    copytext.style.display = "block"
    
  
    // Get candidates for caller, save to db
    pc.onicecandidate = (event) => {
      event.candidate && offerCandidates.add(event.candidate.toJSON());
    };
  
    // Create offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);
  
    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };
  
    await callDoc.set({ offer });
  
    // Listen for remote answer
    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription);
      }
    });
  
    // When answered, add candidate to peer connection
    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });
  
    hangupButton.disabled = false;

answerButton.style.display = "none"
  };
  
  // 3. Answer the call with the unique ID
  answerButton.onclick = async () => {
    const callId = callInput.value;
    const callDoc = firestore.collection('calls').doc(callId);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');
  
    pc.onicecandidate = (event) => {
      event.candidate && answerCandidates.add(event.candidate.toJSON());
    };
  
    const callData = (await callDoc.get()).data();
  
    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
  
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);
  
    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };
  
    hangupButton.style.display = "block"
    answerButton.style.display = "none"
    callInput.style.display = "none"



    await callDoc.update({ answer });
    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        console.log(change);
        if (change.type === 'added') {
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };
  copytext.onclick = () =>{
    copy(callInput.value)
    alert('Code Copied')
  }

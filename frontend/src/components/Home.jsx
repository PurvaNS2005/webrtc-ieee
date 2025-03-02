import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "./WebSocketProvider";

const STUN_SERVER = "stun:stun.l.google.com:19302";

function Home() {
  const [roomCode, setRoomCode] = useState("");
  const {ws, userId, setUserId} = useWebSocket();
  const [peers, setPeers] = useState({});
  const [createdRoomId, setCreatedRoomId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "userIdAssigned":
          setUserId(data.userId);
          break;
        case "roomCreated":
          setCreatedRoomId(data.roomId);
          alert(`Room created: ${data.roomId}`);
          break;
        case "roomExists":
          if (data.exists) {
            ws.send(JSON.stringify({ type: "joinRoom", roomId: data.roomId }));
          } else {
            alert("Entered room does not exist.");
          }
          break;
        case "roomJoined":
          navigate(`/room/${data.roomId}`);
          startWebRTCConnection(data.userId);
          break;
        case "webrtcOffer":
          handleReceivedOffer(data.offer, data.from);
          break;
        case "webrtcAnswer":
          handleReceivedAnswer(data.answer, data.from);
          break;
        case "iceCandidate":
          handleNewICECandidate(data.candidate, data.senderId);
          break;
        case "error":
          alert(data.message);
          break;
        default:
          console.warn("Unhandled WebSocket message:", data);
      }
    };

    ws.onmessage = handleMessage;

    return () => {
      ws.onmessage = null;
    };
  }, [ws, navigate, setUserId]);

  const startWebRTCConnection = (peerId) => {
    if (peers[peerId]) return; // Avoid duplicate connections

    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: STUN_SERVER }],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(
          JSON.stringify({
            type: "iceCandidate",
            candidate: event.candidate,
            to: peerId,
          })
        );
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        console.log(`Connected to peer: ${peerId}`);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (
        peerConnection.iceConnectionState === "disconnected" ||
        peerConnection.iceConnectionState === "failed"
      ) {
        console.log(`Peer ${peerId} disconnected. Cleaning up.`);
        peerConnection.close();
        setPeers((prev) => {
          const updatedPeers = { ...prev };
          delete updatedPeers[peerId];
          return updatedPeers;
        });
      }
    };

    setPeers((prev) => ({ ...prev, [peerId]: peerConnection }));

    peerConnection.createOffer().then(async (offer) => {
      await peerConnection.setLocalDescription(offer);
      ws.send(
        JSON.stringify({
          type: "webrtcOffer",
          offer,
          to: peerId,
        })
      );
    });
  };

  const handleReceivedOffer = async (offer, from) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: STUN_SERVER }],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(
          JSON.stringify({
            type: "iceCandidate",
            candidate: event.candidate,
            to: from,
          })
        );
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        console.log(`Connected to peer: ${from}`);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (
        peerConnection.iceConnectionState === "disconnected" ||
        peerConnection.iceConnectionState === "failed"
      ) {
        console.log(`Peer ${from} disconnected. Cleaning up.`);
        peerConnection.close();
        setPeers((prev) => {
          const updatedPeers = { ...prev };
          delete updatedPeers[from];
          return updatedPeers;
        });
      }
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    setPeers((prev) => ({ ...prev, [from]: peerConnection }));

    ws.send(
      JSON.stringify({
        type: "webrtcAnswer",
        answer,
        to: from,
      })
    );
  };

  const handleReceivedAnswer = (answer, from) => {
    peers[from]?.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleNewICECandidate = (candidate, from) => {
    peers[from]?.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const handleCreateRoom = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "createRoom" }));
    }
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) {
      alert("Please enter a valid room code.");
      return;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "checkRoom", roomId: roomCode }));
    } else {
      alert("WebSocket not connected. Please refresh the page.");
    }
  };

  return (
    <div>
      <h1>P2P FILE SHARING</h1>
      <p>
        Your User ID: <strong>{userId}</strong>
      </p>

      <div>
        <button onClick={handleCreateRoom}>Create Room</button>
        {createdRoomId && (
          <p>
            Room ID (Your ID): <strong>{createdRoomId}</strong>
          </p>
        )}

        <input
          type="text"
          placeholder="Enter Room Code (Host's ID)"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
        />

        <button onClick={handleJoinRoom}>Join Room</button>
      </div>
    </div>
  );
}

export default Home;

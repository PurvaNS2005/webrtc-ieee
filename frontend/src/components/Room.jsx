import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useWebSocket } from "./WebSocketProvider";

function Room() {
  const { roomId } = useParams();
  const { ws, userId } = useWebSocket();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!ws) return;

    // Request current users when joining
    ws.send(JSON.stringify({ type: "joinRoom", roomId }));

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "roomJoined":
          console.log(`✅ Joined room: ${data.roomId}`);
          setUsers(data.users);
          break;

        case "new-member":
          setUsers(data.users);
          break;

        case "userDisconnected":
          setUsers((prev) => prev.filter((id) => id !== data.userId));
          break;

        default:
          console.warn("Unhandled message:", data);
      }
    };

    return () => {
      ws.send(JSON.stringify({ type: "leaveRoom", roomId }));
    };
  }, [ws, roomId]);

  return (
    <div className="room-container">
  <h2>📢 Room ID: {roomId}</h2>
  <h3>👥 Users in Room:</h3>

  {users.length === 0 ? (
    <p>No users in the room.</p>
  ) : (
    <table className="user-table">
      <thead>
        <tr>
          <th>#</th>
          <th>User ID</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user, index) => (
          <tr key={user} className={user === userId ? "current-user" : ""}>
            <td>{index + 1}</td>
            <td>
              <button className="user-button">
                {user === userId ? `${user} (You)` : user}
              </button>
            </td>
            <td>
              <button className="select-button">Select</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</div>

  );
}

export default Room;
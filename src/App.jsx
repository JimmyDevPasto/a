import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import io from 'socket.io-client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const UPDATE_INTERVAL = 5000; // 5 seconds

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [users, setUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  
  useEffect(() => {
    // Create socket connection
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    // Function to get and emit user location
    const updateAndEmitLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = [position.coords.latitude, position.coords.longitude];
            
            // Only set initial userId if it hasn't been set
            if (!userId) {
              const uniqueUserId = `User-${Math.random().toString(36).substr(2, 6)}`;
              setUserId(uniqueUserId);
              setUserLocation(location);
              // Emit initial location with new ID
              newSocket.emit('userLocation', { location, id: uniqueUserId });
            } else {
              setUserLocation(location);
              // Emit updated location with existing ID
              newSocket.emit('userLocation', { location, id: userId });
            }
          },
          (error) => {
            console.error('Error getting location:', error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
          }
        );
      }
    };

    // Get initial location
    updateAndEmitLocation();

    // Set up interval for location updates
    const locationInterval = setInterval(updateAndEmitLocation, UPDATE_INTERVAL);

    // Listen for location updates from other users
    newSocket.on('updateLocations', (updatedUsers) => {
      console.log('Users received from server:', updatedUsers);
      setUsers(updatedUsers);
    });

    // Cleanup on unmount
    return () => {
      clearInterval(locationInterval);
      newSocket.disconnect();
    };
  }, [userId]); // Add userId to dependency array

  // Custom marker icon
  const userIcon = L.icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <h1 style={{ textAlign: 'center', margin: '10px 0' }}>User Location Map</h1>
      
      <div 
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
          zIndex: 1000
        }}
      >
        <h3>Connected Users: {users.length}</h3>
      </div>

      {userLocation ? (
        <MapContainer
          center={userLocation}
          zoom={13}
          style={{ height: '90%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Current user marker */}
          <Marker position={userLocation} icon={userIcon}>
            <Popup>You are here (ID: {userId})</Popup>
          </Marker>
          
          {/* Other users markers */}
          {users.map((user) => (
            user.id !== userId && (
              <Marker
                key={user.id}
                position={user.location}
                icon={userIcon}
              >
                <Popup>
                  User ID: {user.id}
                  <br />
                  Location: {user.location.join(', ')}
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      ) : (
        <p style={{ textAlign: 'center' }}>Loading map and location...</p>
      )}
    </div>
  );
}

export default App;
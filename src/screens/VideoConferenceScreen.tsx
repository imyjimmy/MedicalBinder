import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { useNavigation } from '@react-navigation/native';
import WebRTCService from '../services/WebRTCService';
import { RTCSessionDescription } from 'react-native-webrtc';
import type { RootStackParamList } from '../../App';

interface VideoConferenceScreenProps {
  route: RouteProp<RootStackParamList, 'VideoConference'>;
}

export const VideoConferenceScreen: React.FC<VideoConferenceScreenProps> = ({route}) => {
  const { baseUrl, token } = route.params;
  const SIGNALING_URL = `${baseUrl}/api/webrtc`;
  const navigation = useNavigation();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('connecting');
  const [roomId, setRoomId] = useState<string>('bright-dolphin-swimming');
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [isWaitingForDoctor, setIsWaitingForDoctor] = useState(true);

  useEffect(() => {
    initializeCall();
    return () => {
      WebRTCService.endCall();
    };
  }, []);

  const initializeCall = async () => {
    WebRTCService.setCallbacks({
      onLocalStream: (stream) => {
        setLocalStream(stream);
      },
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        setIsWaitingForDoctor(false);
      },
      onConnectionStateChange: (state) => {
        setConnectionState(state);
        if (state === 'failed' || state === 'disconnected') {
          Alert.alert('Connection Lost', 'The video call was disconnected.');
        }
      },
    });

    const success = await WebRTCService.initializeCall();
    if (!success) {
      Alert.alert('Error', 'Failed to initialize video call');
      navigation.goBack();
    }

    const stream = await mediaDevices.getUserMedia({video: true, audio: true});
    console.log('stream: ', stream);
    setLocalStream(stream);

    console.log('localStream exists:', !!stream);
    console.log('localStream URL:', stream?.toURL());
    console.log('Stream tracks:', stream.getTracks().map(t => t.kind)); // Should show ['video', 'audio']

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, // Free Google STUN
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    console.log('peerConnection: ', peerConnection);
    peerConnection.addStream(stream);
    setPeerConnection(peerConnection);

    await joinRoom(roomId, token, peerConnection);
  };

  const joinRoom = async (roomId: string, jwtToken: string, peerConnection: RTCPeerConnection) => {
    try {
      // Step 1: Join the room
      console.log(`about to join room by hitting endpoint: ${SIGNALING_URL}/rooms/${roomId}/join with jwt: ${jwtToken}`);

      const joinResponse = await fetch(`${SIGNALING_URL}/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const joinResult = await joinResponse.json();
      console.log('Joined room:', joinResult);
      
      // Step 2: Start WebRTC offer/answer exchange
      await startSignalingLoop(roomId, jwtToken, peerConnection);
      
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const startSignalingLoop = async (roomId: string, jwtToken: string, peerConnection: RTCPeerConnection) => {
    if (!peerConnection) {
      console.error('No peer connection available');
      return;
    }

    let remoteDescriptionSet = false;
    let pendingIceCandidates: any = [];

    // Handle ICE candidates (React Native WebRTC way)
    peerConnection.addEventListener('icecandidate', async (event: any) => {
      if (event.candidate) {
        console.log('CLIENT: Sending ICE candidate');
        try {
          await fetch(`${SIGNALING_URL}/rooms/${roomId}/ice-candidate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${jwtToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ candidate: event.candidate })
          });
        } catch (error) {
          console.error('CLIENT: Error sending ICE candidate:', error);
        }
      }
    });

    // Handle remote stream (React Native WebRTC way)
    peerConnection.addEventListener('addstream', (event: any) => {
      console.log('CLIENT: Received remote stream!');
      if (event.stream) {
        setRemoteStream(event.stream);
        console.log('CLIENT: ✅ Remote stream set!');
      }
    });

    console.log('=== CLIENT: Starting signaling loop ===');
    // Create offer and send it
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await peerConnection!.setLocalDescription(offer as RTCSessionDescription);
    console.log('CLIENT: Created and set local offer');

    // Send offer to server
    const offerResponse = await fetch(`${SIGNALING_URL}/rooms/${roomId}/offer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ offer })
    });
    
    console.log('CLIENT: Sent offer to server, response:', offerResponse.status);
  
    // Poll for answer
    console.log('CLIENT: Starting to poll for answer...');
    
    // Poll for answer (simple approach)
    const pollForAnswer = setInterval(async () => {
      try {
        const response = await fetch(`${SIGNALING_URL}/rooms/${roomId}/answer`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        });

        const { answer } = await response.json();
        
        if (answer && answer.answer) {
          clearInterval(pollForAnswer);
          clearInterval(pollForIceCandidates);
          await peerConnection.setRemoteDescription(answer.answer);
          console.log('CLIENT: ✅ Answer received and set! Connection should be established.');
          // NOW it's safe to add ICE candidates
          remoteDescriptionSet = true;

            // Add any pending ICE candidates
          for (const candidate of pendingIceCandidates) {
            try {
              await peerConnection.addIceCandidate(candidate);
              console.log('CLIENT: Added pending ICE candidate');
            } catch (error) {
              console.error('CLIENT: Error adding pending ICE candidate:', error);
            }
          }
          pendingIceCandidates = []; // Clear the queue
        }
      } catch (error) {
        console.error('Error polling for answer:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Poll for remote ICE candidates
    const pollForIceCandidates = setInterval(async () => {
      console.log('poll for Ice Candidates');
      try {
        const response = await fetch(`${SIGNALING_URL}/rooms/${roomId}/ice-candidates`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        });

        console.log('CLIENT: ICE candidates response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('CLIENT: ICE candidates error:', response.status, errorText);
          return;
        }

        const { candidates } = await response.json();

        if (candidates && candidates.length > 0) {
          console.log(`CLIENT: Received ${candidates.length} ICE candidates`);
          for (const candidateData of candidates) {
            console.log('CLIENT: Adding remote ICE candidate');
            await peerConnection.addIceCandidate(candidateData.candidate);
          }
        }
      } catch (error) {
        console.error('CLIENT: Error handling ICE candidates:', error);
      }
    }, 2000);
  };

  const toggleAudio = () => {
    const enabled = WebRTCService.toggleAudio();
    setIsAudioEnabled(enabled);
  };

  const toggleVideo = () => {
    const enabled = WebRTCService.toggleVideo();
    setIsVideoEnabled(enabled);
  };

  // const endCall = () => {
  //   Alert.alert(
  //     'End Call',
  //     'Are you sure you want to end the call?',
  //     [
  //       { text: 'Cancel', style: 'cancel' },
  //       {
  //         text: 'End Call',
  //         style: 'destructive',
  //         onPress: () => {
  //           WebRTCService.endCall();
  //           navigation.goBack();
  //         },
  //       },
  //     ]
  //   );
  // };

  const leaveCall = async () => {
    Alert.alert(
      'Leave Call',
      'Are you sure you want to leave the call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Call',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call leave endpoint
              await fetch(`${SIGNALING_URL}/rooms/${roomId}/leave`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              // Close peer connection
              peerConnection?.close();
              
              // Stop local stream
              localStream?.getTracks().forEach(track => track.stop());
              
              // Navigate back
              navigation.goBack();
              
            } catch (error) {
              console.error('Error leaving room:', error);
              navigation.goBack(); // Still go back even if API call fails
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Remote Video (Doctor) */}
      <View style={styles.remoteVideoContainer}>
        {remoteStream ? (
          <>
            <RTCView 
              streamURL={remoteStream.toURL()} 
              style={styles.remoteVideo}
              objectFit="cover"
            />
            {/* <RTCView streamURL={remoteStream.toURL()} style={{width: 200, height: 200}} /> */}
            <View style={styles.remoteLabel}>
              <Text style={styles.remoteLabelText}>Dr. Smith</Text>
            </View>
          </>
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>
              {isWaitingForDoctor ? 'Waiting for doctor to join...' : 'Connecting...'}
            </Text>
            <Text style={styles.connectionStatus}>
              Status: {connectionState}
            </Text>
          </View>
        )}
      </View>

      {/* Local Video (Patient) */}
      <View style={styles.localVideoContainer}>
        {localStream && (
          <>
          <RTCView 
            streamURL={localStream.toURL()} 
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
          />
          </>
        )}
        <View style={styles.localLabel}>
          <Text style={styles.localLabelText}>You</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, !isAudioEnabled && styles.controlButtonDisabled]}
          onPress={toggleAudio}
        >
          <Text style={styles.controlButtonText}>
            {isAudioEnabled ? '🎤' : '🔇'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isVideoEnabled && styles.controlButtonDisabled]}
          onPress={toggleVideo}
        >
          <Text style={styles.controlButtonText}>
            {isVideoEnabled ? '📹' : '📷'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={leaveCall}
        >
          <Text style={styles.controlButtonText}>📞</Text>
        </TouchableOpacity>
      </View>
      <View style={{position: 'absolute', top: 40, left: 20, zIndex: 999}}>
        <Text style={{color: 'white', backgroundColor: 'red', padding: 5}}>
          Local Stream: {localStream ? 'EXISTS' : 'NONE'}
        </Text>
        <Text style={{color: 'white', backgroundColor: 'red', padding: 5}}>
          Stream URL: {localStream?.toURL().substring(0, 8)}...
        </Text>
        <Text style={{color: 'white', backgroundColor: 'red', padding: 5}}>
          Active: {localStream?.active ? 'YES' : 'NO'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  waitingText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
  },
  connectionStatus: {
    color: '#888',
    fontSize: 14,
  },
  remoteLabel: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  remoteLabelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 80,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  localVideo: {
    flex: 1,
    width: '100%',
  },
  localLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  localLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(255,0,0,0.3)',
    borderColor: 'rgba(255,0,0,0.5)',
  },
  endCallButton: {
    backgroundColor: 'rgba(255,0,0,0.8)',
    borderColor: 'rgba(255,0,0,1)',
  },
  controlButtonText: {
    fontSize: 24,
  },
});
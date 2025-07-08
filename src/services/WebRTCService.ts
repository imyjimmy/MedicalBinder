import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';

interface WebRTCCallbacks {
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange: (state: string) => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private callbacks: WebRTCCallbacks | null = null;

  private configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  setCallbacks(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
  }

  async initializeCall() {
    try {
      // Get local media stream
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { 
          width: 640, 
          height: 480, 
          frameRate: 30,
          facingMode: 'user' 
        },
      });
      
      this.localStream = stream;
      this.callbacks?.onLocalStream(stream);

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.configuration);

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addStream(this.localStream);
        }
      });

      const peerConnection = this.peerConnection as any;

      // Handle remote stream via track events
      peerConnection.addEventListener('track', (event: any) => {
        const [remoteStream] = event.streams;
        this.callbacks?.onRemoteStream(remoteStream);
      });

      // Handle connection state changes
      peerConnection.addEventListener('connectionstatechange', () => {
        const state = this.peerConnection?.connectionState || 'unknown';
        this.callbacks?.onConnectionStateChange(state);
      });

      // Handle ICE candidates
      peerConnection.addEventListener('icecandidate', (event: any) => {
        if (event.candidate && this.callbacks?.onIceCandidate) {
          this.callbacks.onIceCandidate(event.candidate);
        }
      });

      return true;
    } catch (error) {
      console.error('Error initializing call:', error);
      return false;
    }
  }

  async createOffer() {
    if (!this.peerConnection) return null;
    
    const offer = await this.peerConnection.createOffer({});
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer() {
    if (!this.peerConnection) return null;
    
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleOffer(offer: RTCSessionDescription) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(offer);
  }

  async handleAnswer(answer: RTCSessionDescription) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidate) {
    if (!this.peerConnection) return;
    await this.peerConnection.addIceCandidate(candidate);
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

export default new WebRTCService();
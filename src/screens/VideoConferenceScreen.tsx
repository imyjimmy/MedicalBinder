import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  RTCView,
  MediaStream,
} from 'react-native-webrtc';
import { useNavigation } from '@react-navigation/native';
import WebRTCService from '../services/WebRTCService';

export const VideoConferenceScreen: React.FC = () => {
  const navigation = useNavigation();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('connecting');
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
  };

  const toggleAudio = () => {
    const enabled = WebRTCService.toggleAudio();
    setIsAudioEnabled(enabled);
  };

  const toggleVideo = () => {
    const enabled = WebRTCService.toggleVideo();
    setIsVideoEnabled(enabled);
  };

  const endCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end the call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: () => {
            WebRTCService.endCall();
            navigation.goBack();
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
          <RTCView 
            streamURL={localStream.toURL()} 
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
          />
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
          onPress={endCall}
        >
          <Text style={styles.controlButtonText}>📞</Text>
        </TouchableOpacity>
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
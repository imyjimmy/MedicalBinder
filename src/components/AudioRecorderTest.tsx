// import React, { useState } from 'react';
// import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
// import AudioRecorderPlayer from 'react-native-audio-recorder-player'; // Legacy import

// const audioRecorderPlayer = new AudioRecorderPlayer();

// const AudioRecorderTest = () => {
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordTime, setRecordTime] = useState('00:00:00');
//   const [audioPath, setAudioPath] = useState('');

//   const onStartRecord = async () => {
//     try {
//       // Legacy API - works without NitroModules
//       const result = await audioRecorderPlayer.startRecorder();
//       console.log('Recording started:', result);
      
//       // Legacy callback style
//       audioRecorderPlayer.addRecordBackListener((e) => {
//         setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
//       });
      
//       setIsRecording(true);
//     } catch (error) {
//       console.error('Recording start error:', error);
//       Alert.alert('Error', 'Failed to start recording');
//     }
//   };

//   const onStopRecord = async () => {
//     try {
//       const result = await audioRecorderPlayer.stopRecorder();
//       audioRecorderPlayer.removeRecordBackListener();
      
//       setIsRecording(false);
//       setRecordTime('00:00:00');
//       setAudioPath(result);
      
//       console.log('Recording stopped, saved to:', result);
//       Alert.alert('Success', `Audio saved to: ${result}`);
//     } catch (error) {
//       console.error('Recording stop error:', error);
//       Alert.alert('Error', 'Failed to stop recording');
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>🎙️ Audio Recorder (Legacy API)</Text>
//       <Text style={styles.timer}>{recordTime}</Text>
      
//       <TouchableOpacity
//         style={[styles.button, isRecording ? styles.stopButton : styles.startButton]}
//         onPress={isRecording ? onStopRecord : onStartRecord}
//       >
//         <Text style={styles.buttonText}>
//           {isRecording ? 'Stop Recording' : 'Start Recording'}
//         </Text>
//       </TouchableOpacity>
      
//       {audioPath ? (
//         <Text style={styles.pathText}>Last recording: {audioPath}</Text>
//       ) : null}
//     </View>
//   );
// };

// // ... same styles as before
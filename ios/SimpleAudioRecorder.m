#import "SimpleAudioRecorder.h"
#import <AVFoundation/AVFoundation.h>
#import <React/RCTLog.h>

@interface SimpleAudioRecorder ()
@property (nonatomic, strong) AVAudioRecorder *audioRecorder;
@property (nonatomic, strong) AVAudioSession *audioSession;
@end

@implementation SimpleAudioRecorder

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(startRecording:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSString *documentsDirectory = [paths objectAtIndex:0];
    NSString *filePath = [documentsDirectory stringByAppendingPathComponent:@"recording.m4a"];
    NSURL *url = [NSURL fileURLWithPath:filePath];
    
    // Audio session setup
    self.audioSession = [AVAudioSession sharedInstance];
    NSError *sessionError;
    [self.audioSession setCategory:AVAudioSessionCategoryPlayAndRecord error:&sessionError];
    [self.audioSession setActive:YES error:&sessionError];
    
    if (sessionError) {
        reject(@"SESSION_ERROR", @"Failed to setup audio session", sessionError);
        return;
    }
    
    // Recorder settings for AAC
    NSDictionary *settings = @{
        AVFormatIDKey: @(kAudioFormatMPEG4AAC),
        AVSampleRateKey: @44100.0,
        AVNumberOfChannelsKey: @2,
        AVEncoderAudioQualityKey: @(AVAudioQualityHigh)
    };
    
    NSError *recorderError;
    self.audioRecorder = [[AVAudioRecorder alloc] initWithURL:url settings:settings error:&recorderError];
    
    if (recorderError) {
        reject(@"RECORDER_ERROR", @"Failed to create recorder", recorderError);
        return;
    }
    
    BOOL success = [self.audioRecorder record];
    if (success) {
        resolve(filePath);
    } else {
        reject(@"RECORD_ERROR", @"Failed to start recording", nil);
    }
}

RCT_EXPORT_METHOD(stopRecording:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    if (self.audioRecorder && self.audioRecorder.isRecording) {
        [self.audioRecorder stop];
        NSString *filePath = self.audioRecorder.url.path;
        resolve(filePath);
    } else {
        reject(@"NOT_RECORDING", @"No active recording", nil);
    }
}

@end
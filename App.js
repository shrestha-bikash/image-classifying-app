import { StatusBar } from 'expo-status-bar';
import React, {useState, useEffect} from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, ImageBackground, Image } from 'react-native';
import {Button} from 'react-native-elements';
import * as tf from '@tensorflow/tfjs'
import { fetch } from '@tensorflow/tfjs-react-native'
import {Camera} from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'
import * as jpeg from 'jpeg-js'
import * as mobilenet from '@tensorflow-models/mobilenet'

let camera = Camera;

export default function App() {

  const [tfReady, setTfReady] = useState(false);
  const [startCamera, setStartCamera] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [prediction, setPrediction] = useState(null);

  const check_tf = (async () => {
    await tf.ready();
    setTfReady(true);
  });

  const _startCamera = async () => {
    const {status} = await Camera.requestPermissionsAsync()
    if(status === 'granted') {
      setStartCamera(true)
    }
    else {
      Alert.alert("Access denied")
    }
  }

  const __takePicture = async () => {
    const photo = await camera.takePictureAsync()
    console.log(photo)
    setPreviewVisible(true)
    //setStartCamera(false)
    setCapturedImage(photo)
    setStartCamera(false);
  }

  const imageToTensor = (base64) => {
    const rawImageData = tf.util.encodeString(base64, 'base64');
    const TO_UINT8ARRAY = true
    const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY)
    // Drop the alpha channel info for mobilenet
    const buffer = new Uint8Array(width * height * 3)
    let offset = 0 // offset into original data
    for (let i = 0; i < buffer.length; i += 3) {
      buffer[i] = data[offset]
      buffer[i + 1] = data[offset + 1]
      buffer[i + 2] = data[offset + 2]

      offset += 4
    }

    return tf.tensor3d(buffer, [height, width, 3])
  }

  const classify_image = (async(photo) => {
    let image = await resizeImage(photo.uri, 224 , 224);
    
    let imageTensor = imageToTensor(image.base64);

    let model = await mobilenet.load()
    try {
      const prediction = await model.classify(imageTensor)
      console.log(prediction)
      setPrediction(prediction[0])
    }
    catch (err) {
      Alert.alert(err)
    }

  })

  async function resizeImage(imageUrl, width, height){
    const actions = [{
      resize: {
        width,
        height
      },
    }];
    const saveOptions = {
      compress: 0.75,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    };
    const res = await ImageManipulator.manipulateAsync(imageUrl, actions, saveOptions);
    return res;
  }

  useEffect(() => {
    check_tf()
  }, []);

  return (
    <View style={styles.container}>
      
      <View
        style={{
          height: '75%',
          width: '100%'
        }}
      >
        {startCamera ? 
          <Camera
            style={{flex: 1,width:"100%", height: '100%'}}
            ref={(r) => {
            camera = r
            }}
          >
            <View
              style={{
              position: 'absolute',
              bottom: 0,
              flexDirection: 'row',
              flex: 1,
              width: '100%',
              padding: 20,
              justifyContent: 'space-between'
              }}
            >
            <View
                style={{
                alignSelf: 'center',
                flex: 1,
                alignItems: 'center'
                }}
                >
                  <TouchableOpacity
                    onPress={__takePicture}
                    style={{
                    width: 70,
                    height: 70,
                    bottom: 0,
                    borderRadius: 50,
                    backgroundColor: '#fff'
                    }}
                    />
              </View>
            </View>
          </Camera>
          :
          <View
           style={{
             flex: 1,
             width: '100%',
             height: '80%',
             justifyContent: 'center',
             alignItems: 'center'
           }}
          > 
            
            {
              previewVisible && capturedImage && (
                <View
                style={{
                  width: '80%',
                  height: '80%'
                }}
                >
                  <CameraPreview photo={capturedImage} ></CameraPreview>
                  <Button
                    title="Classify Picture"
                    buttonStyle={styles.buttonStyle}
                    onPress={() => classify_image(capturedImage)}
                  ></Button>
                  {
                    prediction && <Text>Class: {prediction.className} Probability: {prediction.probability}</Text>
                  }
                  
                </View>
              )
              
            }
            <Button
              title="Take Picture"
              buttonStyle={styles.buttonStyle}
              onPress={_startCamera}
            ></Button>
            
          </View>
        }
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonStyle: {
    
    marginTop: 15,
    marginBottom: 15
  }
});

const CameraPreview = ({photo}) => {
  
  return (
    <View
      style={{
        backgroundColor: 'transparent',
        flex: 1,
        width: '100%',
        height: '100%',
        marginBottom: 20
      }}
    >
      <ImageBackground
        source={{uri: photo && photo.uri}}
        style={{
          flex: 1
        }}
      >
      </ImageBackground>
    </View>
  )
}
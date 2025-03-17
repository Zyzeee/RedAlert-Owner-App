import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ImageBackground, Image, TouchableWithoutFeedback, Linking, BackHandler, togglePasswordVisibility} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail ,  sendEmailVerification} from 'firebase/auth';
import AppContext from '../AppContext';
import { app, DB } from '../firebase';
import { ref, onValue, query, get, orderByChild, equalTo } from 'firebase/database';

export default function OwnerLoginScreen() {
  const navigation = useNavigation();
	const { setOwnerId, setUserId } = useContext(AppContext); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true); // State to manage hiding/showing password

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Return true to prevent default behavior (i.e., back navigation) only if on HomeScreen
        if (navigation.isFocused()) {
          return true;
        }
      }
    );

    return () => backHandler.remove(); // Cleanup event listener on unmount
  }, [navigation]);

  const togglePasswordVisibility = () => {
    setHidePassword(!hidePassword); // Toggle the hidePassword state
  };

  const handleLogin = async () => {
    if (email === '' || password === '') {
      Alert.alert('Warning', 'Please fill in all fields');
      return;
    }
  
    // Validate email format (only Gmail addresses)
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      Alert.alert('Failed to Login!', 'Please enter a Gmail address');
      return;
    }
  
    try {
      app
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Check if the user's email is verified
      if (!user.emailVerified) {
        const resendVerification = await Alert.alert(
          'Failed to Login!',
          'Please verify your email before logging in. Send verification link?',
          [
            {
              text: 'Cancel',
              onPress: () => console.log('Cancel Pressed'),
              style: 'cancel'
            },
            {
              text: 'Send',
              onPress: async () => {
                try {
                  await sendEmailVerification(auth.currentUser);
                  Alert.alert('Verification Email Sent', 'Please check your email to verify your account');
                } catch (error) {
                  console.error('Error sending verification email:', error);
                  Alert.alert('Error', 'Failed to send verification email');
                }
              }
            }
          ],
          { cancelable: false }
        );
        return;
      }

			getOwnerByUserId(auth.currentUser.uid).then(owner => {
				const key = Object.keys(owner)[0];
				setOwnerId(key);
        setUserId(auth.currentUser.uid);

				// If login successful and email is verified, navigate to OwnerInterface
				navigation.navigate('OwnerInterface');
			})
  
      // Clear email and password fields after successful login
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Error logging in:', error);
      Alert.alert('Failed to Login!', 'Incorrect email or password');
    }
  };

	const getOwnerByUserId = async (userId) => {
		const ownersRef = ref(DB, '/Owner');
		const ownersQuery = query(ownersRef, orderByChild('userId'), equalTo(userId));
		const snapshot = await get(ownersQuery);
		return snapshot.val();
	}

  const navigateToRegister = () => {
    navigation.navigate('OwnerRegisterScreen');
  };

  // Function to handle forgot password
  const handleForgotPassword = () => {
    const auth = getAuth();
    sendPasswordResetEmail(auth, email)
      .then(() => {
        Alert.alert('Password Reset Email Sent', 'Please check your email to reset your password');
      })
      .catch((error) => {
        console.error('Error sending password reset email:', error);
        Alert.alert('Fill in Email field', 'Please try again');
      });
  };

  return (
    <ImageBackground source={require('./redalertbg.png')} style={styles.backgroundImage}>
      <View style={styles.container}>
        <View>
          <Image source={require('./Redalert.png')} style={styles.image} />
        </View>
        <Text style={styles.title}>Owner Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={'#808080'}
          value={email}
          onChangeText={text => setEmail(text)}
          keyboardType="email-address"
        />
      <View style={styles.passwordContainer}>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor={'#808080'}
              value={password}
              onChangeText={text => setPassword(text)}
              secureTextEntry={hidePassword} // Toggle secureTextEntry based on hidePassword state
            />
          </View>
          <TouchableWithoutFeedback onPress={togglePasswordVisibility}>
            <Text style={styles.togglePassword}>{hidePassword ? 'Show' : 'Hide'}</Text>
          </TouchableWithoutFeedback>
      </View>
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>LOGIN</Text>
        </TouchableOpacity>
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Having trouble with your password? </Text>
        </View>
        <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.resetText}>Reset your password</Text>
          </TouchableOpacity>
        <View style={styles.Or}>
          <Text style={styles.OrText}>Or</Text>
        </View>
        <View style={styles.RegisterContainter}>
          <Text style={styles.RegisterText}>Do you wish to </Text><TouchableOpacity onPress={navigateToRegister}><Text style={styles.Register}>Register?</Text></TouchableOpacity> 
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  image: {
    width: 120,
    height: 170,
    marginBottom: 30,
    top: 5
  },
  title: {
    fontSize: 35,
    color: 'black',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  input: {
    color: 'black',
    width: '100%',
    padding: 7,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#C70039',
    fontWeight: 'bold',
    borderRadius: 15,
    backgroundColor: 'white',
    fontSize: 20,
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  passwordInputContainer: {
    flex: 1,
    borderWidth: 3,
    borderColor: '#C70039',
    borderRadius: 15,
    paddingRight: 40, 
    backgroundColor: 'white',
  },
  passwordInput: {
    color: 'black',
    padding: 7,
    fontWeight: 'bold',
    fontSize: 20,
  },
  togglePassword: {
    color: '#808080',
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -8 }], 
    fontSize: 16, 
  },
  forgotPasswordContainer: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: '#C70039',
    fontWeight: 'bold',
    fontSize: 15,
  },
  loginButton: {
    backgroundColor: '#D14F1F',
    width: 90,
    paddingVertical: 10,
    borderRadius: 15,
    marginTop: 15,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  loginText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    left: 13,
    paddingBottom: 15,
    top: 45,
  },
  resetText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2F3D9D',
    textDecorationLine: 'underline',
    marginLeft: 18,
    top: 46,
  },
  orContainer: {
    marginTop: 15,
  },
  orText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  Or: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  OrText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    left: 1,
    paddingBottom: 15,
    top: 50,
  },
  RegisterContainter: {
    marginTop: 15,
  },
  RegisterText: {
    flexDirection: 'row',
    alignItems: 'center',
    top: 30,
    fontSize: 18,
    fontWeight: 'bold',
    right: 25,
  },
  Register: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    left: 90,
    paddingBottom: 1,
    top: 15,
    textDecorationLine: 'underline',
    color: '#2F3D9D'
  },
});

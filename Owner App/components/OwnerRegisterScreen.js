import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, Image, ImageBackground, ScrollView, Linking } from 'react-native';
import { createUserWithEmailAndPassword, sendEmailVerification, deleteUser } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { DB, auth } from '../firebase'; // Adjust import if your firebase file is in a different location

export default function OwnerRegisterScreen() {
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const sanitizeModelNumber = (modelNumber) => {
    // Replace invalid characters with an underscore or another safe character
    return modelNumber.replace(/[\.\#\$\[\]]/g, '_');
  };

  const handleRegister = async () => {
    if (phoneNumber === '' || email === '' || modelNumber === '' || password === '' || confirmPassword === '' || latitude === '' || longitude === '') {
      Alert.alert('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match');
      return;
    }

    if (!agreeTerms) {
      Alert.alert('Please agree to terms and conditions');
      return;
    }

    const lowercaseEmail = email.toLowerCase();
    const standardizedPhoneNumber = phoneNumber.replace(/\D/g, '');
    if (standardizedPhoneNumber.length !== 11) {
      Alert.alert('Invalid Phone Number', 'Phone number must be 11 digits long');
      return;
    }

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      Alert.alert('Invalid Email', 'Please enter a Gmail address');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Invalid Password', 'Password must be 8 characters long or more');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, lowercaseEmail, password);
      const user = userCredential.user;
      const uid = user.uid;

      await sendEmailVerification(user);

      const sanitizedModelNumber = sanitizeModelNumber(modelNumber);
      const ownerRef = ref(DB, 'Owner');
      const snapshot = await get(ownerRef);
      let phoneNumberExists = false;
      let modelNumberExists = false;

      snapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val();
        if (user.PhoneNumber === standardizedPhoneNumber) {
          phoneNumberExists = true;
          return true;
        }
        if (childSnapshot.key === sanitizedModelNumber) {
          modelNumberExists = true;
          return true;
        }
      });

      if (phoneNumberExists) {
        await deleteUser(user);
        Alert.alert('Phone Number Already Exists', 'This phone number is already registered');
        return;
      }

      if (modelNumberExists) {
        await deleteUser(user);
        Alert.alert('Model Number Already Exists', 'This model number is already registered');
        return;
      }

      await set(ref(DB, `Owner/${sanitizedModelNumber}`), {
        userId: uid,
        PhoneNumber: standardizedPhoneNumber,
        Email: lowercaseEmail,
        Password: password,
        latitude: latitude,
        longitude: longitude,
        arrived: true,
        allowed: true,
      });

      Alert.alert('Registration successful!', 'A verification email has been sent to your email address.');
      setEmail('');
      setPhoneNumber('');
      setModelNumber('');
      setPassword('');
      setConfirmPassword('');
      setLatitude('');
      setLongitude('');
      setAgreeTerms(false);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Email is already registered');
      } else {
        console.error('Error registering user:', error);
        Alert.alert('Error registering user:', error.message);
      }
    }
  };

  return (
    <ImageBackground
      source={require('./redalertbg.png')}
      style={styles.container}
    >
      <View style={styles.container}>
        <View>
          <Image source={require('./Redalert.png')} style={styles.image} />
        </View>
        <Text style={styles.title}>Create Account</Text>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer}>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={phoneNumber}
            onChangeText={text => setPhoneNumber(text)}
            keyboardType='numeric'
            placeholderTextColor="grey"
          />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            value={email}
            onChangeText={text => setEmail(text)}
            keyboardType="email-address"
            placeholderTextColor="grey"
          />
          <TextInput
            style={styles.input}
            placeholder="Model Number"
            value={modelNumber}
            onChangeText={text => setModelNumber(text)}
            placeholderTextColor="grey"
          />
          <TextInput
            style={styles.input}
            placeholder="Latitude"
            value={latitude}
            onChangeText={text => setLatitude(text)}
            keyboardType="numeric"
            placeholderTextColor="grey"
          />
          <TextInput
            style={styles.input}
            placeholder="Longitude"
            value={longitude}
            onChangeText={text => setLongitude(text)}
            keyboardType="numeric"
            placeholderTextColor="grey"
          />
          <Text style={styles.helpText}>
            Don't know how to get coordinates? Click{' '}
            <Text style={styles.helpLink} onPress={() => Linking.openURL('https://www.youtube.com/watch?v=iaVt0w1GWeQ&ab_channel=HardReset.Info')}>
              how
            </Text>
          </Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              value={password}
              onChangeText={text => setPassword(text)}
              secureTextEntry={!showPassword}
              placeholderTextColor="grey"
            />
            <TouchableOpacity onPress={togglePasswordVisibility} style={styles.visibilityButton}>
              <Text style={styles.visibilityButtonText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={text => setConfirmPassword(text)}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor="grey"
            />
            <TouchableOpacity onPress={toggleConfirmPasswordVisibility} style={styles.visibilityButton}>
              <Text style={styles.visibilityButtonText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              {agreeTerms && <Text style={styles.checked}>✓</Text>}
            </TouchableOpacity>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>I read and agree to</Text>
              <TouchableOpacity style={styles.termsButton} onPress={() => Alert.alert('Terms & Conditions')}>
                <Text style={styles.termsButtonText}>Terms & Conditions</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Button title="Register Now" onPress={handleRegister} color="#C70039" disabled={!agreeTerms} />
        </ScrollView>
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
  scrollView: {
    width: '100%',
    maxHeight: 300, // Adjust this height to fit only 4 placeholders on the screen
  },
  scrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    backgroundColor: 'white',
    color: 'black',
    width: 313,
    padding: 7,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#C70039',
    fontWeight: 'bold',
    borderRadius: 15,
    fontSize: 20,
  },
  helpText: {
    color: 'black',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  helpLink: {
    color: 'green',
    fontWeight: 'bold',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#C70039',
    borderRadius: 15,
    width: '100%',
    backgroundColor: 'white',
  },
  passwordInput: {
    flex: 1,
    padding: 7,
    fontWeight: 'bold',
    fontSize: 20,
    color: 'black',
  },
  visibilityButton: {
    padding: 10,
  },
  visibilityButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 1,
    marginTop: 15,
  },
  checked: {
    color: '#C70039',
    top: -2
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  termsText: {
    color: '#000',
  },
  termsButton: {
    marginLeft: 5,
  },
  termsButtonText: {
    color: '#C70039',
  },
});

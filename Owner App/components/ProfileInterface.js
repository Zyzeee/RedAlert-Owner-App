import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { updateEmail, updatePassword } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';
import { auth, DB } from '../firebase'; // Adjust the import path if necessary

export default function Profile() {
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (user) {
        const uid = user.uid;
        const ownerRef = ref(DB, `Owner`);
        const snapshot = await get(ownerRef);
        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          if (userData.userId === uid) {
            setEmail(userData.Email);
            setPhoneNumber(userData.PhoneNumber);
            setLatitude(userData.latitude);
            setLongitude(userData.longitude);
          }
        });
      }
    };

    fetchData();
  }, []);

  const handleUpdateProfile = async () => {
    if (password && password !== confirmPassword) {
      Alert.alert('Passwords do not match');
      return;
    }

    const standardizedPhoneNumber = phoneNumber.replace(/\D/g, '');
    if (phoneNumber && standardizedPhoneNumber.length !== 11) {
      Alert.alert('Invalid Phone Number', 'Phone number must be 11 digits long');
      return;
    }

    if (email && !email.toLowerCase().endsWith('@gmail.com')) {
      Alert.alert('Invalid Email', 'Please enter a Gmail address');
      return;
    }

    try {
      const user = auth.currentUser;

      if (email && email !== user.email) {
        await updateEmail(user, email.toLowerCase());
      }

      if (password) {
        await updatePassword(user, password);
      }

      const ownerRef = ref(DB, 'Owner');
      const snapshot = await get(ownerRef);
      let userKey = '';

      snapshot.forEach((childSnapshot) => {
        const userData = childSnapshot.val();
        if (userData.userId === user.uid) {
          userKey = childSnapshot.key;
        }
      });

      const updates = {};
      if (email) updates.Email = email.toLowerCase();
      if (phoneNumber) updates.PhoneNumber = standardizedPhoneNumber;
      if (latitude) updates.latitude = latitude;
      if (longitude) updates.longitude = longitude;

      await update(ref(DB, `Owner/${userKey}`), updates);

      Alert.alert('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error updating profile:', error.message);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={email}
          onChangeText={text => setEmail(text)}
          keyboardType="email-address"
          placeholderTextColor="grey"
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={phoneNumber}
          onChangeText={text => setPhoneNumber(text)}
          keyboardType='numeric'
          placeholderTextColor="grey"
          editable={isEditing}
        />
        <View style={styles.locationContainer}>
          <TextInput
            style={styles.locationInput}
            placeholder="Latitude"
            value={latitude}
            onChangeText={text => setLatitude(text)}
            keyboardType="numeric"
            placeholderTextColor="grey"
            editable={isEditing}
          />
          <TextInput
            style={styles.locationInput}
            placeholder="Longitude"
            value={longitude}
            onChangeText={text => setLongitude(text)}
            keyboardType="numeric"
            placeholderTextColor="grey"
            editable={isEditing}
          />
        </View>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            value={password}
            onChangeText={text => setPassword(text)}
            secureTextEntry={!showPassword}
            placeholderTextColor="grey"
            editable={isEditing}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.visibilityButton}>
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
            editable={isEditing}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.visibilityButton}>
            <Text style={styles.visibilityButtonText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>
        <Button title={isEditing ? "Save Profile" : "Edit Profile"} onPress={isEditing ? handleUpdateProfile : handleEditToggle} color="#C70039" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  scrollView: {
    width: '100%',
  },
  scrollContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 35,
    color: 'black',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    color: 'black',
    width: 313,
    padding: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#C70039',
    fontWeight: 'bold',
    borderRadius: 10,
    fontSize: 18,
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  locationInput: {
    backgroundColor: 'white',
    color: 'black',
    width: 150,
    padding: 10,
    borderWidth: 2,
    borderColor: '#C70039',
    fontWeight: 'bold',
    borderRadius: 10,
    fontSize: 18,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 313,
    borderWidth: 2,
    borderColor: '#C70039',
    borderRadius: 10,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 10,
    fontWeight: 'bold',
    fontSize: 18,
    color: 'black',
  },
  visibilityButton: {
    padding: 10,
  },
  visibilityButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
});

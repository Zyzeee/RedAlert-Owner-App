	import React, { useContext, useState, useEffect, useRef } from 'react';
	import { BackHandler, View, StyleSheet, TouchableOpacity, Text, Animated, Dimensions, Alert, Image, ScrollView } from 'react-native';
	import MapView, { Marker } from 'react-native-maps';
	import { useNavigation } from '@react-navigation/native';
	import { DB } from '../firebase';
	import { ref, onValue, get } from 'firebase/database';
	import AppContext from '../AppContext';
	import { alarmNotification } from '../notification';
	import notifee from '@notifee/react-native';
	import { BarChart } from 'react-native-chart-kit';

	const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

	export default function App() {
		const navigation = useNavigation();
		const { ownerId, userId } = useContext(AppContext);
		const [isDataOpen, setIsDataOpen] = useState(false);
		const [isContactOpen, setIsContactOpen] = useState(false);
		const [dataBoxWidth, setDataBoxWidth] = useState(screenWidth * 0.8);
		const [dataBoxHeight, setDataBoxHeight] = useState(screenHeight * 0.5);
		const [dataBoxTop, setDataBoxTop] = useState((screenHeight - dataBoxHeight) / 2);
		const [owner, setOwner] = useState(null);
		const [markers, setMarkers] = useState([]);
		const [imageValues, setImageValues] = useState({ Temperature: '', Smoke: '', Fire: '' });
		const [contactInformation, setContactInformation] = useState('');
		const [gatheringData, setGatheringData] = useState(true);
		const timeoutRef = useRef(null);
		const [allowed, setAllowed] = useState(true);
		const [arrived, setArrived] = useState(false);
		const [pinColor, setPinColor] = useState('red');
		const [menuPressed, setMenuPressed] = useState(false);
		const [menuAnimation] = useState(new Animated.Value(0));
		const [initialRegion, setInitialRegion] = useState(null);
		const [houseOnFire, setHouseOnFire] = useState(false);
		const [notificationSent, setNotificationSent] = useState(false);
		const [time, setTime] = useState([]);
		const [temp, setTemp] = useState([]);
		const [smoke, setSmoke] = useState([]);
		const [fire, setFire] = useState([]);
		const [barChartData, setBarChartData] = useState({
			labels: ['10mins', '20mins', '30mins', '40mins', '50mins'],
			datasets: [
				{
					data: [],
				},
			],
		});

		let menuTimeout;

		const startTimer = () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			setGatheringData(true);

			timeoutRef.current = setTimeout(() => {
				setGatheringData(false);
			}, 10000);
		};

		useEffect(() => {
			const requestNotificationPermission = async () => {
				await notifee.requestPermission();
				console.log('Notification permissions granted!');
		};

		requestNotificationPermission();

			const dataRef = ref(DB, `/Owner/${ownerId}`);
			const unsubscribe = onValue(dataRef, (snapshot) => {
				setOwner(snapshot.val());
				startTimer();
			});

			const logsCallback = (snapshot) => {
				if (!snapshot.exists()) {
					setTime([])
					setTemp([])
					setSmoke([])
					setFire([])
					return;
				}
				const filterLogs = Object.keys(snapshot.val()).filter(key => {
					const { UserID } = snapshot.val()[key.toString()]
					return UserID == userId
				});
				let time = [];
				let temp = [];
				let smoke = [];
				let fire = [];
				filterLogs.map((log, index) => {
					const l = snapshot.val()[log];
					time.push(
						((index + 1) * 10).toString()
					)
					temp.push(
						l.Temperature?.toString()
					)
					smoke.push(
						l.Smoke >= 150 ? 'Yes' : 'No'
					)
					fire.push(
						l.Fire ? 'Yes' : 'No'
					)
				})

				setTime(time);
				setTemp(temp);
				setSmoke(smoke);
				setFire(fire);
			}

			const logsRef = ref(DB, `/Logs`);
			const fetchOnceLogs = async () => {
				const onceSnapshot = await get(logsRef);
				if (onceSnapshot.exists()) {
					logsCallback(onceSnapshot);
				}
			}
			fetchOnceLogs();

			const unsubscribeLogs = onValue(logsRef, (snapshot) => {
				logsCallback(snapshot);
			});

			const logsCVCallback = (snapshot) => {
				if (!snapshot.exists()) {
					setBarChartData({
						labels: ['10mins', '20mins', '30mins', '40mins', '50mins'],
						datasets: [
							{
								data: [],
							},
						],
					})
					return;
				};

				const filterLogs = Object.keys(snapshot.val()).filter(key => {
					const { UserID } = snapshot.val()[key.toString()]
					return UserID == userId
				});
				let cvs = [];
				let cvsIndex = [];
				filterLogs.map((log, index) => {
					const l = snapshot.val()[log];
					cvs.push(
						l.CombinedValue
					)
					cvsIndex.push(
						(10 * (index + 1)).toString() + 'mins'
					)
				})
				setBarChartData({
					labels: cvsIndex,
					datasets: [
						{
							data: cvs,
						},
					],
				});
			}

			const logsCVRef = ref(DB, `/LogsCV`);
			const fetchOnceLogsCV = async () => {
				const onceSnapshot = await get(logsCVRef);
				if (onceSnapshot.exists()) {
					logsCVCallback(onceSnapshot);
				}
			}
			fetchOnceLogsCV();

			const unsubscribeLogsCV = onValue(logsCVRef, (snapshot) => {
				logsCVCallback(snapshot);
			});

			return () => {
				unsubscribe();
				unsubscribeLogs();
				unsubscribeLogsCV();
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
				}
			};
		}, []);

		useEffect(() => {
			if (owner && owner.latitude && owner.longitude) {
				setAllowed(owner.allowed);
				setArrived(owner.arrived);
				setHouseOnFire(owner.Fire);
				setInitialRegion({
					latitude: parseFloat(owner.latitude),
					longitude: parseFloat(owner.longitude),
					latitudeDelta: 0.1,
					longitudeDelta: 0.1,
				});
			}
		}, [owner]);

		useEffect(() => {
			const backgroundNotif = async () => {
			  const channelId = await notifee.createChannel({
				id: 'Background Notification',
				name: 'Alarm Channel',
				vibration: true,
				vibrationPattern: [300, 500],
				sound: 'alarm'
			  });
		
			  // Check if arrived is true and notification hasn't been sent yet
			  if (arrived && !notificationSent) {
				alarmNotification({ channelId, time: Date.now() + 1000, title: 'Red Alert', body: "BFP has arrived!" });
				setNotificationSent(true); // Set notificationSent to true to avoid duplicate notifications
			  }
			};
		
			backgroundNotif();
		  }, [arrived, notificationSent]);

		useEffect(() => {
			// const color = arrived ? 'green' : gatheringData ? 'red' : 'yellow';
			const color = !allowed ? 'green' : gatheringData ? 'red' : 'yellow';
			setPinColor(color);
		}, [arrived, allowed, gatheringData]);

		useEffect(() => {
			if (houseOnFire) {
				// displayNotification({ body: 'IMPORTANT! Your House is on Fire!' });
				const backgroundNotif = async () => {
					const channelId = await notifee.createChannel({
						id: 'Background Notification',
						name: 'Alarm Channel',
						vibration: true,
						vibrationPattern: [300, 500],
						sound: 'alarm'
					});

					alarmNotification({ channelId, time: Date.now() + 1000, title: 'Red Alert', body: 'Your House is Currently on Fire!'  });
				}

				backgroundNotif();
			}
		}, [houseOnFire]);

		useEffect(() => {
			if (!allowed) {
				const backgroundNotif = async () => {
					const channelId = await notifee.createChannel({
						id: 'Background Notification',
						name: 'Alarm Channel',
						vibration: true,
						vibrationPattern: [300, 500],
						sound: 'alarm',
					});
	
					alarmNotification({
						channelId,
						time: Date.now() + 1000,
						title: 'Red Alert',
						body: 'BFP is Now responding!',
					});
				};
				backgroundNotif();
			}
		}, [allowed]);

		useEffect(() => {
			const backHandler = BackHandler.addEventListener(
				'hardwareBackPress',
				() => {
					if (navigation.isFocused()) {
						return true;
					}
				}
			);

			return () => backHandler.remove();
		}, [navigation]);

		const toggleDataBox = () => {
			setContactInformation('');
			setIsDataOpen(!isDataOpen);
		};

		const toggleMenu = () => {
			if (menuPressed) {
			Animated.timing(menuAnimation, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
			}).start(() => setMenuPressed(false));
			} else {
			Animated.timing(menuAnimation, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
			}).start(() => {
				setMenuPressed(true);
				menuTimeout = setTimeout(() => {
				Animated.timing(menuAnimation, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true,
				}).start(() => setMenuPressed(false));
				}, 5000);
			});
			}
		};

		const toggleContactBox = () => {
			setIsContactOpen(!isContactOpen);
			setIsDataOpen(false);
		};

		const handleMarkerPress = (id) => {
			setIsDataOpen(false);
			setIsContactOpen(false);
			// setOwnerId(id);
		};

		const UpdateProfile = () => {
			Alert.alert(
				'Confirm',
				'Do you want to change your profile?',
				[ {
					text: 'No',
					onPress: () => console.log('Stay on Owner Interface'),
					style: 'cancel',
				},
				{ text: 'Yes', onPress: () => navigation.navigate('ProfileInterface') },
			],
			{ cancelable: false }
		);
		};

		const handleLogout = () => {
			Alert.alert(
				'Confirm',
				'Do you want to logout?',
				[
					{
						text: 'No',
						onPress: () => console.log('Stay on Owner Interface'),
						style: 'cancel',
					},
					{ text: 'Yes', onPress: () => navigation.navigate('OwnerLoginScreen') },
				],
				{ cancelable: false }
			);
		};

		const handleLocationButtonPress = (location) => {
			let contactInfo = '';
			switch (location) {
				case 'Indang':
					contactInfo = 'Indang Fire Station Hot Lines:\n\n415-1217\n0961-881-3913\n0915-603-4245\n0933-824-5948';
					break;
				case 'Amadeo':
					// Define contact information for Amadeo
					contactInfo = 'Amadeo Fire Station Hot Lines:\n\n(046) 890-4985\n𝐠𝐥𝐨𝐛𝐞: 0915-601-6805';
					break;
				case 'Trece Martires City':
					// Define contact information for Trece Martires City
					contactInfo = 'Trece Martires City Fire Station Hot Lines: \n\n419-0057 (𝐋𝐚𝐧𝐝𝐥𝐢𝐧𝐞)\n09452388226 (𝐓𝐌/𝐠𝐥𝐨𝐛𝐞)';
					break;
				case 'Mendez':
					// Define contact information for Mendez
					contactInfo = 'Mendez Fire Station Hot Lines:\n\n(046) 482-0712\n0919-092-0206';
					break;
				case 'Alfonso':
					// Define contact information for Alfonso
					contactInfo = 'Alfonso Fire Station Hot Lines:\n\nGlobe: 0915-602-2113\nSmart: 0929-663-2424\nTel. no: (046) 522-0480\nTel. no: (046) 889-4979';
					break;
				case 'Tagaytay':
					// Define contact information for Tagaytay
					contactInfo = 'Tagaytay Fire Station Hot Lines:\n\n483-1193\n471-3747\n09429898495\n09552306663';
					break;
				case 'Naic':
					// Define contact information for Tagaytay
					contactInfo = 'Naic Fire Station Hot Lines:\n\nSMART (0946)-9565-753\nGLOBE (0956)-483-0226';
					break;
				default:
					break;
			}
			// Set contact information
			setContactInformation(contactInfo);
			// Close contact box and show data box
			setIsContactOpen(false);
			setIsDataOpen(true);
		};

		const headerHeight = 50; // Height of the header

		return (
			<View style={styles.container}>
				<MapView
				style={styles.map}
				initialRegion={initialRegion}
			>
					{owner && !owner.arrived && owner.latitude && owner.longitude && (
						<Marker
						key={`ownerId-${ownerId}-${pinColor}`}
						coordinate={{ latitude: parseFloat(owner.latitude), longitude: parseFloat(owner.longitude)}}
						onPress={() => handleMarkerPress(ownerId)}
						pinColor={pinColor}
					/>)
					}
						{/* {markers && markers.length > 0 && markers.map(marker => (
						!marker.arrived && marker.latitude && marker.longitude && (
							<Marker
								key={marker.key}
								coordinate={{ latitude: marker.latitude, longitude: marker.longitude}}
								onPress={() => handleMarkerPress(marker.key)}
							/>
						)
					))} */}
						</MapView>

						{(isDataOpen || isContactOpen) && (
							<>
							{/* <View style={[styles.dataBox, { width: dataBoxWidth, height: dataBoxHeight, top: dataBoxTop + headerHeight, zIndex: 0 }]}> */}
							<View style={[styles.dataBox, { width: 313, height: 580, top: 10, zIndex: 1 }]}>
								<View style={[styles.header, { width: dataBoxWidth, zIndex: 1 }]}>
									<Text style={styles.headerText}>
										{isContactOpen ? "BFP Contact Numbers" : ""}
									</Text>
								</View>
								{isContactOpen ? (
									<View style={styles.locationButtons}>
										<TouchableOpacity style={styles.locationButton} onPress={() => handleLocationButtonPress('Indang')}>
											<Text style={styles.buttonText}>Indang</Text>
										</TouchableOpacity>
										<TouchableOpacity style={styles.locationButton} onPress={() => handleLocationButtonPress('Amadeo')}>
											<Text style={styles.buttonText}>Amadeo</Text>
										</TouchableOpacity>
										<TouchableOpacity style={styles.locationButton} onPress={() => handleLocationButtonPress('Trece Martires City')}>
											<Text style={styles.buttonText}>Trece</Text>
										</TouchableOpacity>
										<TouchableOpacity style={styles.locationButton} onPress={() => handleLocationButtonPress('Mendez')}>
											<Text style={styles.buttonText}>Mendez</Text>
										</TouchableOpacity>
										<TouchableOpacity style={styles.locationButton} onPress={() => handleLocationButtonPress('Alfonso')}>
											<Text style={styles.buttonText}>Alfonso</Text>
										</TouchableOpacity>
										<TouchableOpacity style={styles.locationButton} onPress={() => handleLocationButtonPress('Tagaytay')}>
											<Text style={styles.buttonText}>Tagaytay</Text>
										</TouchableOpacity>
										<TouchableOpacity style={styles.locationButton} onPress={() => handleLocationButtonPress('Naic')}>
											<Text style={styles.buttonText}>Naic</Text>
										</TouchableOpacity>
									</View>
								) : (
									<ScrollView>
									<Text style={styles.contactInfo}>{contactInformation}</Text>
									{isDataOpen && contactInformation == '' && 
										<View style={styles.dataTable}>
											<View style={styles.dataTableCol}>
												<Text style={[styles.dataTableText, styles.dataTableTextHeader]}>Time</Text>
												{time.map((value, index) => <Text key={`${value}-${index}`} style={styles.dataTableText}>{value}</Text>)}
											</View>
											<View style={styles.dataTableCol}>
												<Text style={[styles.dataTableText, styles.dataTableTextHeader]}>Temp</Text>
												{temp.map((value, index) => <Text key={`${value}-${index}`} style={styles.dataTableText}>{value}</Text>)}
											</View>
											<View style={styles.dataTableCol}>
												<Text style={[styles.dataTableText, styles.dataTableTextHeader]}>Smoke</Text>
												{smoke.map((value, index) => <Text key={`${value}-${index}`} style={styles.dataTableText}>{value}</Text>)}
											</View>
											<View style={styles.dataTableCol}>
												<Text style={[styles.dataTableText, styles.dataTableTextHeader]}>Fire</Text>
												{fire.map((value, index) => <Text key={`${value}-${index}`} style={styles.dataTableText}>{value}</Text>)}
											</View>
										</View>
									}
									{isDataOpen && contactInformation == '' &&
										<ScrollView horizontal={true}>
											{barChartData.datasets[0].data.length > 0 && <View style={{ width: '100%', paddingVertical: 15, paddingHorizontal: 10}}>
											<BarChart
												data={barChartData}
												width={Math.max(barChartData.datasets[0].data.length * 90, 150)}
												height={270}
												yAxisLabel=""
												yAxisSuffix=""
												chartConfig={{
													backgroundColor: '#fff',
													backgroundGradientFrom: '#fff',
													backgroundGradientTo: '#fff',
													decimalPlaces: 2, // optional, defaults to 2dp
													color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
													labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
												}}
												style={{
													marginVertical: 20,
												}}
												verticalLabelRotation={30}
												fromZero={true}
											/></View>}
										</ScrollView>
									}
									</ScrollView>
								)}
								</View>
							{/* <View style={[styles.header, { width: dataBoxWidth, zIndex: 1 }]}>
							<Text style={styles.headerText}>
								{isContactOpen ? "BFP Contact Numbers" : ""}
							</Text>
						</View> */}
							</>
						)}

							<TouchableOpacity style={styles.dataButton} onPress={toggleDataBox}>
								<Text style={styles.buttonText}>Data</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
								<Text style={styles.buttonText}>Menu</Text>
							</TouchableOpacity>

						<Animated.View style={[styles.menuOptionContainer, { opacity: menuAnimation }]}>
							<TouchableOpacity style={styles.menuOption} onPress={UpdateProfile}>
								<Text style={styles.buttonText}>Profile</Text>
							</TouchableOpacity>

							<TouchableOpacity style={styles.ContactButton} onPress={toggleContactBox}>
								<Text style={styles.buttonText}>Contact</Text>
							</TouchableOpacity>

							<TouchableOpacity style={styles.menuOption} onPress={handleLogout}>
								<Text style={styles.buttonText}>Logout</Text>
							</TouchableOpacity>
						</Animated.View>

							

							<View style={styles.outerContainer}>
        <View style={styles.squareContainer}>
          <View style={[styles.square, styles.redSquare]}>
          </View><Text style={styles.text}>Device still active</Text>
          <View style={[styles.square, styles.greenSquare]}>
          </View><Text style={styles.text}>Rescuer on route</Text>
          <View style={[styles.square, styles.yellowSquare]}>
          </View><Text style={styles.text}>Device possibly broken</Text>
        </View>
      </View>
							{ownerId !== '' && (
								<View style={[styles.imageContainer, ownerId !== '' ? styles.imageContainerShow : '']}>
									<View style={styles.imageValuesContainer}>
										<Image source={require('../assets/Heat.png')} style={styles.image} />
										<Text style={styles.imageValuesText}>{owner && owner.Temperature ? owner.Temperature : ''}</Text>
									</View>
									<View style={styles.imageValuesContainer}> 
										<Image source={require('../assets/Smoke.png')} style={styles.image} />
										<Text style={styles.imageValuesText}>{owner && owner.Smoke && owner.Smoke >= 150 ? 'Detected' : 'Not Detected'}</Text>
									</View>
									<View style={styles.imageValuesContainer}> 
										<Image source={require('../assets/Fire.png')} style={styles.image} />
										<Text style={styles.imageValuesText}>{owner && owner.Fire ? 'Detected' : 'Not Detected'}</Text>
									</View>
								</View>
							)}
							</View>
		);
	}

	const styles = StyleSheet.create({
		container: {
			flex: 1,
		},
		map: {
			...StyleSheet.absoluteFillObject,
		},
		header: {
			position: 'absolute',
			top: 0,
			backgroundColor: 'red',
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			paddingVertical: 10,
			paddingHorizontal: 20,
			justifyContent: 'center',
			alignItems: 'center',
			left: 0,
		},
		headerText: {
			color: 'white',
			fontSize: 18,
			fontWeight: 'bold',
		},
		dataBox: {
			position: 'absolute',
			backgroundColor: 'white',
			borderRadius: 20,
			padding: 20,
			paddingTop: 40,
			justifyContent: 'flex-start',
			alignItems: 'center',
			elevation: 5,
			alignSelf: 'center',
		},
		dataButton: {
			position: 'absolute',
			bottom: 20,
			left: 20,
			width: 80,
			height: 40,
			backgroundColor: '#5A92C6',
			borderRadius: 20,
			alignItems: 'center',
			justifyContent: 'center',
		},
		ContactButton: {
			backgroundColor: 'rgba(0, 0, 0, 0.5)',
			width: 100,
			height: 40,
			borderRadius: 20,
			alignItems: 'center',
			justifyContent: 'center',
			marginVertical: 5,
			borderRadius: 20,
		},
		buttonText: {
			color: 'white',
			fontSize: 16,
		},
		imageContainer: {
			position: 'absolute',
			top: 50,
			left: 15,
			padding: 10,
			backgroundColor: 'rgba(128, 128, 128, 0.5)',
			borderRadius: 15,
		},
		imageValuesContainer: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		imageValuesText: {
			color: '#fff',
			marginLeft: 5,
		},
		image: {
			width: 30,
			height: 30,
			marginVertical: 5,
			marginRight: 10,
		},
		menuButton: {
			position: 'absolute',
			bottom: 20,
			right: 20,
			width: 80,
			height: 40,
			backgroundColor: '#5A92C6',
			borderRadius: 20,
			alignItems: 'center',
			justifyContent: 'center',
		},
		menuOptionContainer: {
			position: 'absolute',
			bottom: 70,
			right: 20,
			backgroundColor: '#5A92C6',
			borderRadius: 20,
			padding: 10,
			right: 10,
		},
		menuOption: {
			backgroundColor: 'rgba(0, 0, 0, 0.5)',
			width: 100,
			height: 40,
			borderRadius: 20,
			alignItems: 'center',
			justifyContent: 'center',
			marginVertical: 5,
			borderRadius: 20,
		},
		locationButtons: {
			marginTop: 20,
			flexDirection: 'row',
			flexWrap: 'wrap',
			justifyContent: 'center',
		},
		locationButton: {
			margin: 5,
			padding: 10,
			backgroundColor: '#5A92C6',
			borderRadius: 20,
			width: '40%',
			alignItems: 'center',
		},
		contactInfo: {
			marginTop: 10,
			color: 'black',
			textAlign: 'center',
			fontSize: 16,
		},
		dataTable: {
			width: '100%',
			flexDirection: 'row',
			justifyContent: 'space-evenly'
		},
		dataTableCol: {
			flexDirection: 'column',
			gap: 10,
			justifyContent: 'center',
			alignItems: 'center'
		},
		dataTableText: {
			color: 'black'
		},
		dataTableTextHeader: {
			fontWeight: '700'
		},
		outerContainer: {
			position: 'absolute',
			top: 200,
			left: 15,
			padding: 10,
			backgroundColor: 'rgba(128, 128, 128, 0.5)',
			borderRadius: 15,
			width: 140,
			height: 100,
		  },
		  squareContainer: {
			flexDirection: 'column',
			alignItems: 'center',
		  },
		  square: {
			width: 10,
			height: 10,
			margin: 5,
			justifyContent: 'center',
			alignItems: 'center',
			borderRadius: 8,
			right: 53,
		  },
		  redSquare: {
			backgroundColor: 'red',
		  },
		  greenSquare: {
			backgroundColor: 'green',
		  },
		  yellowSquare: {
			backgroundColor: 'yellow',
		  },
		  text: {
			color: 'black',
			fontWeight: 'bold',
			textAlign: 'center',
			fontSize: 12,
			left: 9,
			bottom: 15
		  },
		
	});

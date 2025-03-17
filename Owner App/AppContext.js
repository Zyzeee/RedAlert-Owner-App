import React, { createContext, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [ownerId, setOwnerId] = useState({});
  const [userId, setUserId] = useState({});

  return (
    <AppContext.Provider value={{ ownerId, setOwnerId, userId, setUserId }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;

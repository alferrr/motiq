"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeContextType = {
  dark: boolean;
  toggleTheme: () => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  companyName: string;
  setCompanyName: (name: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  userRole: string;
  setUserRole: (role: string) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  dark: false,
  toggleTheme: () => {},
  primaryColor: "#2563eb",
  setPrimaryColor: () => {},
  companyName: "",
  setCompanyName: () => {},
  userName: "",
  setUserName: () => {},
  userRole: "",
  setUserRole: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [primaryColor, setPrimaryColorState] = useState("#2563eb");
  const [companyName, setCompanyNameState] = useState("");
  const [userName, setUserNameState] = useState("");
  const [userRole, setUserRoleState] = useState("");

  useEffect(() => {
    const storedTheme = localStorage.getItem("motiq-theme");
    if (storedTheme === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
    const storedColor = localStorage.getItem("motiq-color");
    if (storedColor) {
      setPrimaryColorState(storedColor);
      document.documentElement.style.setProperty(
        "--color-primary",
        storedColor,
      );
    }
    const storedCompany = localStorage.getItem("motiq-company-name");
    if (storedCompany) setCompanyNameState(storedCompany);
    const storedUser = localStorage.getItem("motiq-user-name");
    if (storedUser) setUserNameState(storedUser);
    const storedRole = localStorage.getItem("motiq-user-role");
    if (storedRole) setUserRoleState(storedRole);
  }, []);

  const toggleTheme = () => {
    setDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("motiq-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("motiq-theme", "light");
      }
      return next;
    });
  };

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
    document.documentElement.style.setProperty("--color-primary", color);
    localStorage.setItem("motiq-color", color);
  };

  const setCompanyName = (name: string) => {
    setCompanyNameState(name);
    localStorage.setItem("motiq-company-name", name);
  };

  const setUserName = (name: string) => {
    setUserNameState(name);
    localStorage.setItem("motiq-user-name", name);
  };

  const setUserRole = (role: string) => {
    setUserRoleState(role);
    localStorage.setItem("motiq-user-role", role);
  };

  return (
    <ThemeContext.Provider
      value={{
        dark,
        toggleTheme,
        primaryColor,
        setPrimaryColor,
        companyName,
        setCompanyName,
        userName,
        setUserName,
        userRole,
        setUserRole,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

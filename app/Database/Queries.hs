{-# LANGUAGE OverloadedStrings #-}

module Database.Queries where

import Database.PostgreSQL.Simple

connectDB :: IO Connection
connectDB = do
  conn <- connect defaultConnectInfo
    { connectHost = "localhost"
    , connectPort = 5432
    , connectUser = "postgres"
    , connectPassword = "root"
    , connectDatabase = "poesias"
    }

  _ <- execute_ conn "SET search_path TO poesias"
  pure conn

module Main where

import Network.Wai.Handler.Warp
import Server.Handler
import Database.Queries
import System.Environment (lookupEnv)
import Text.Read (readMaybe)

main :: IO ()
main = do
  conn    <- connectDB
  portEnv <- lookupEnv "PORT"
  let port = maybe 8080 (maybe 8080 id . readMaybe) portEnv
  run port (app conn)

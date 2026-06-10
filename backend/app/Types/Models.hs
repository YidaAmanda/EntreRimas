{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DuplicateRecordFields #-}

module Types.Models where

import GHC.Generics
import Data.Aeson
import Database.PostgreSQL.Simple.FromRow (FromRow (..), field)

data Users = Users{
    id_user    :: Int,
    nome       :: String,
    senha      :: String,
    bio        :: String,
    city       :: String,
    accent     :: Int,
    created_at :: String
} deriving (Show, Generic)

instance ToJSON Users
instance FromJSON Users
instance FromRow Users where
    fromRow = Users <$> field <*> field <*> field <*> field <*> field <*> field <*> field

data Posts = Posts{
    id_post      :: Int,
    id_user_post :: Int,
    txt_post     :: String,
    txt_title    :: String,
    ic_comment   :: Bool,
    created_at   :: String
} deriving (Show, Generic)

instance ToJSON Posts
instance FromJSON Posts
instance FromRow Posts where
    fromRow = Posts <$> field <*> field <*> field <*> field <*> field <*> field

data Follows = Follows{
    id_follow :: Int,
    id_seguidor :: Int,
    id_seguido :: Int
} deriving (Show, Generic)

instance ToJSON Follows
instance FromJSON Follows
instance FromRow Follows where
    fromRow = Follows <$> field <*> field <*> field

data Favorites = Favorites{
    id_favorite :: Int,
    id_user_fav :: Int,
    id_post_fav :: Int
} deriving (Show, Generic)

instance ToJSON Favorites
instance FromJSON Favorites
instance FromRow Favorites where
    fromRow = Favorites <$> field <*> field <*> field

data Comments = Comments{
    id_comment  :: Int,
    id_user_com :: Int,
    id_post_com :: Int,
    txt_comment :: String,
    created_at  :: String
} deriving (Show, Generic)

instance ToJSON Comments
instance FromJSON Comments
instance FromRow Comments where
    fromRow = Comments <$> field <*> field <*> field <*> field <*> field

data Likes = Likes{
    id_like :: Int,
    id_user_like :: Int,
    id_post_like :: Int
} deriving (Show, Generic)

instance ToJSON Likes
instance FromJSON Likes
instance FromRow Likes where
    fromRow = Likes <$> field <*> field <*> field

{-# LANGUAGE OverloadedStrings #-}

module Database.Queries where

import Data.ByteString.Char8 (pack)
import Data.Maybe (listToMaybe)
import Database.PostgreSQL.Simple
import System.Environment (getEnv)
import Types.Models

connectDB :: IO Connection
connectDB = do
  dbUrl <- getEnv "DATABASE_URL"
  conn  <- connectPostgreSQL (pack dbUrl)
  _ <- execute_ conn "SET search_path TO poesias"
  pure conn

-- Users

getAllUsers :: Connection -> IO [Users]
getAllUsers conn = query_ conn
  "SELECT id_user, nome, senha FROM users"

getUserById :: Connection -> Int -> IO (Maybe Users)
getUserById conn uid = listToMaybe <$>
  query conn "SELECT id_user, nome, senha FROM users WHERE id_user = ?" (Only uid)

createUser :: Connection -> Users -> IO Users
createUser conn user = do
  rows <- query conn
    "INSERT INTO users (nome, senha) VALUES (?, ?) RETURNING id_user, nome, senha"
    (nome user, senha user)
  pure (head rows)

updateUser :: Connection -> Int -> Users -> IO (Maybe Users)
updateUser conn uid user = listToMaybe <$>
  query conn
    "UPDATE users SET nome = ?, senha = ? WHERE id_user = ? RETURNING id_user, nome, senha"
    (nome user, senha user, uid)

-- Posts

getAllPosts :: Connection -> IO [Posts]
getAllPosts conn = query_ conn
  "SELECT id_post, id_user_post, txt_post, txt_title, ic_comment FROM posts"

getPostsByUser :: Connection -> Int -> IO [Posts]
getPostsByUser conn uid = query conn
  "SELECT id_post, id_user_post, txt_post, txt_title, ic_comment FROM posts WHERE id_user_post = ?"
  (Only uid)

getPostById :: Connection -> Int -> IO (Maybe Posts)
getPostById conn pid = listToMaybe <$>
  query conn
    "SELECT id_post, id_user_post, txt_post, txt_title, ic_comment FROM posts WHERE id_post = ?"
    (Only pid)

createPost :: Connection -> Posts -> IO Posts
createPost conn post = do
  rows <- query conn
    "INSERT INTO posts (id_user_post, txt_post, txt_title, ic_comment) VALUES (?, ?, ?, ?) RETURNING id_post, id_user_post, txt_post, txt_title, ic_comment"
    (id_user_post post, txt_post post, txt_title post, ic_comment post)
  pure (head rows)

updatePost :: Connection -> Int -> Posts -> IO (Maybe Posts)
updatePost conn pid post = listToMaybe <$>
  query conn
    "UPDATE posts SET id_user_post = ?, txt_post = ?, txt_title = ?, ic_comment = ? WHERE id_post = ? RETURNING id_post, id_user_post, txt_post, txt_title, ic_comment"
    (id_user_post post, txt_post post, txt_title post, ic_comment post, pid)

deletePost :: Connection -> Int -> IO ()
deletePost conn pid = do
  _ <- execute conn "DELETE FROM posts WHERE id_post = ?" (Only pid)
  pure ()

-- Comments

getCommentsByPost :: Connection -> Int -> IO [Comments]
getCommentsByPost conn pid = query conn
  "SELECT id_comment, id_user_com, id_post_com, txt_comment FROM comments WHERE id_post_com = ?"
  (Only pid)

createComment :: Connection -> Comments -> IO Comments
createComment conn comment = do
  rows <- query conn
    "INSERT INTO comments (id_user_com, id_post_com, txt_comment) VALUES (?, ?, ?) RETURNING id_comment, id_user_com, id_post_com, txt_comment"
    (id_user_com comment, id_post_com comment, txt_comment comment)
  pure (head rows)

updateComment :: Connection -> Int -> Comments -> IO (Maybe Comments)
updateComment conn cid comment = listToMaybe <$>
  query conn
    "UPDATE comments SET id_user_com = ?, id_post_com = ?, txt_comment = ? WHERE id_comment = ? RETURNING id_comment, id_user_com, id_post_com, txt_comment"
    (id_user_com comment, id_post_com comment, txt_comment comment, cid)

-- Likes

createLike :: Connection -> Likes -> IO Likes
createLike conn like = do
  rows <- query conn
    "INSERT INTO likes (id_user_like, id_post_like) VALUES (?, ?) RETURNING id_like, id_user_like, id_post_like"
    (id_user_like like, id_post_like like)
  pure (head rows)

updateLike :: Connection -> Int -> Likes -> IO (Maybe Likes)
updateLike conn lid like = listToMaybe <$>
  query conn
    "UPDATE likes SET id_user_like = ?, id_post_like = ? WHERE id_like = ? RETURNING id_like, id_user_like, id_post_like"
    (id_user_like like, id_post_like like, lid)

deleteLike :: Connection -> Int -> IO ()
deleteLike conn lid = do
  _ <- execute conn "DELETE FROM likes WHERE id_like = ?" (Only lid)
  pure ()

-- Favorites

createFavorite :: Connection -> Favorites -> IO Favorites
createFavorite conn fav = do
  rows <- query conn
    "INSERT INTO favorites (id_user_fav, id_post_fav) VALUES (?, ?) RETURNING id_favorite, id_user_fav, id_post_fav"
    (id_user_fav fav, id_post_fav fav)
  pure (head rows)

updateFavorite :: Connection -> Int -> Favorites -> IO (Maybe Favorites)
updateFavorite conn fid fav = listToMaybe <$>
  query conn
    "UPDATE favorites SET id_user_fav = ?, id_post_fav = ? WHERE id_favorite = ? RETURNING id_favorite, id_user_fav, id_post_fav"
    (id_user_fav fav, id_post_fav fav, fid)

deleteFavorite :: Connection -> Int -> IO ()
deleteFavorite conn fid = do
  _ <- execute conn "DELETE FROM favorites WHERE id_favorite = ?" (Only fid)
  pure ()

-- Follows

createFollow :: Connection -> Follows -> IO Follows
createFollow conn follow = do
  rows <- query conn
    "INSERT INTO follows (id_seguidor, id_seguido) VALUES (?, ?) RETURNING id_follow, id_seguidor, id_seguido"
    (id_seguidor follow, id_seguido follow)
  pure (head rows)

updateFollow :: Connection -> Int -> Follows -> IO (Maybe Follows)
updateFollow conn fid follow = listToMaybe <$>
  query conn
    "UPDATE follows SET id_seguidor = ?, id_seguido = ? WHERE id_follow = ? RETURNING id_follow, id_seguidor, id_seguido"
    (id_seguidor follow, id_seguido follow, fid)

deleteFollow :: Connection -> Int -> IO ()
deleteFollow conn fid = do
  _ <- execute conn "DELETE FROM follows WHERE id_follow = ?" (Only fid)
  pure ()

<script setup>
import CancelIcon from 'vue-material-design-icons/CloseCircle.vue'
import { useGenreStore } from '../stores/genreStore'
import { ref } from 'vue'

const genreStore = useGenreStore();
const genre = ref({
  name: ''
});

const submitGenre = async() => {
  try {
    await genreStore.addGenre(genre.value)
    genre.value.name = ''
  }catch(error){
    console.log('ジャンルの保存ができませんでした', error);
  }
}

const deleteGenre = async(genreId) => {
  try{
    await genreStore.removeGenre(genreId);
  }catch(error){
    console.log('ジャンルの削除ができませんでした', error);
  }
}

</script>

<template>
    <div class="modal_body">
      <h2 class="input_menu">ジャンル編集</h2>
      <ul>
        <li class="genre_title" v-for="genre in genreStore.genres" :key="genre.id">
          <span>{{ genre.name }}</span>
          <CancelIcon @click="deleteGenre(genre.id)"/>
        </li>
      </ul>
      <input type="text" v-model="genre.name" />
      <input class="input_submit" type="button" value="追加" @click="submitGenre"/>
    </div>
</template>

<style scoped>
ul {
  margin-bottom: 16px;
}

.genre_title {
  width: 200px;
  display: flex;
  justify-content: space-between;
}

.input_title {
  height: 3px;
}

.modal_body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
input,
textarea {
  border: none;
  background-color: #f3f3f3;
  padding: 16px;
  border-radius: 5px;
  width: 230px;
  line-height: 1.5em;
}

.delete_button {
  margin-top: 20px;
  border-style: none;
  font-size: 12px;
  color: rgb(196, 82, 53);
  border-bottom: medium solid rgb(196, 82, 53);
}

.input_submit {
  margin-top: 30px;
  background-color: rgb(66, 163, 247);
  color: white;
  border-radius: 25px;
  border-style: none;
  padding: 16px 40px;
  font-size: 15px;
 }

</style>
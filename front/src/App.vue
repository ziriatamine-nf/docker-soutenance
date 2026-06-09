<script setup>
import { ref, onMounted } from 'vue';

// ---------------------------------------------------------------------------
//  Point IMPORTANT côté Docker :
//  L'URL de l'API est RELATIVE ("/api/..."), pas "http://localhost:3000".
//  Le navigateur appelle donc le MÊME hôte que le front (http://localhost:8080),
//  et c'est Nginx (reverse proxy) qui redirige /api vers le conteneur backend.
//  => le front n'a aucune connaissance de l'adresse du backend.
// ---------------------------------------------------------------------------
const API = '/api/tasks';

const tasks = ref([]);
const newTitle = ref('');
const error = ref('');

async function loadTasks() {
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error('Erreur de chargement');
    tasks.value = await res.json();
    error.value = '';
  } catch (e) {
    error.value = "Impossible de joindre l'API. Le backend est-il démarré ?";
  }
}

async function addTask() {
  const title = newTitle.value.trim();
  if (!title) return;
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error();
    newTitle.value = '';
    await loadTasks();
  } catch (e) {
    error.value = "Échec de l'ajout de la tâche.";
  }
}

async function toggleTask(task) {
  try {
    await fetch(`${API}/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !task.done }),
    });
    await loadTasks();
  } catch (e) {
    error.value = 'Échec de la mise à jour.';
  }
}

async function deleteTask(task) {
  try {
    await fetch(`${API}/${task.id}`, { method: 'DELETE' });
    await loadTasks();
  } catch (e) {
    error.value = 'Échec de la suppression.';
  }
}

onMounted(loadTasks);
</script>

<template>
  <h1><span class="whale">🐳</span> Ma Todo List</h1>
  <p class="subtitle">Vue.js → Nginx → Express → MariaDB · le tout dans Docker</p>

  <form class="add-form" @submit.prevent="addTask">
    <input v-model="newTitle" placeholder="Nouvelle tâche…" />
    <button type="submit">Ajouter</button>
  </form>

  <p v-if="error" class="error">{{ error }}</p>

  <ul>
    <li v-for="task in tasks" :key="task.id" :class="{ done: task.done }">
      <span class="title" @click="toggleTask(task)">
        {{ task.done ? '✅' : '⬜' }} {{ task.title }}
      </span>
      <button class="delete" @click="deleteTask(task)" title="Supprimer">✕</button>
    </li>
  </ul>

  <p v-if="!tasks.length && !error" class="empty">Aucune tâche pour le moment. Ajoutez-en une !</p>
</template>

(function(){
  const API = 'http://localhost:3000/api';
  const els = {
    movieSelect: document.getElementById('movieSelect'),
    seatGrid: document.getElementById('seatGrid'),
    refreshSeats: document.getElementById('refreshSeats'),
    resetSeats: document.getElementById('resetSeats'),
    markAvailable: document.getElementById('markAvailable'),
    markBooked: document.getElementById('markBooked'),
    addRowsInput: document.getElementById('addRowsInput'),
    addRowsBtn: document.getElementById('addRowsBtn')
  };

  let seatData = [];
  let selectedSeatNumbers = new Set();

  init();

  async function init(){
    await loadMovies();
    // Preselect movie from query param if present
    const urlParams = new URLSearchParams(window.location.search);
    const preId = urlParams.get('movieId');
    if (preId) {
      els.movieSelect.value = preId;
    }
    bindEvents();
    if (els.movieSelect.value) await loadSeats(els.movieSelect.value);
  }

  function bindEvents(){
    els.movieSelect.addEventListener('change', async ()=>{
      await loadSeats(els.movieSelect.value);
    });
    els.refreshSeats.addEventListener('click', async ()=>{
      await loadSeats(els.movieSelect.value);
    });
    els.resetSeats.addEventListener('click', async ()=>{
      if (!els.movieSelect.value) return;
      if (!confirm('Reset all seats to available for this movie?')) return;
      await fetch(`${API}/movies/${els.movieSelect.value}/seats/reset`, { method: 'POST' });
      await loadSeats(els.movieSelect.value);
    });
    els.markAvailable.addEventListener('click', ()=>bulkUpdate('available'));
    els.markBooked.addEventListener('click', ()=>bulkUpdate('booked'));
    els.addRowsBtn.addEventListener('click', addRows);
  }

  async function loadMovies(){
    const res = await fetch(`${API}/movies?all=1`);
    const movies = await res.json();
    els.movieSelect.innerHTML = movies.map(m=>`<option value="${m.id}">${escapeHtml(m.name)} - ${m.show_date} ${m.show_time}</option>`).join('');
  }

  async function loadSeats(movieId){
    selectedSeatNumbers.clear();
    const res = await fetch(`${API}/movies/${movieId}/seats`);
    seatData = await res.json();
    renderGrid(seatData);
  }

  function renderGrid(data){
    els.seatGrid.innerHTML = '';
    // Sort by row letter then number
    const sorted = [...data].sort((a,b)=>{
      const [ra,na] = splitSeat(a.seat_number); const [rb,nb] = splitSeat(b.seat_number);
      if (ra===rb) return na-nb; return ra<rb?-1:1;
    });
    sorted.forEach(s=>{
      const div = document.createElement('div');
      div.className = 'seat';
      div.textContent = splitSeat(s.seat_number)[1];
      div.title = s.seat_number;
      styleSeat(div, s.status);
      div.dataset.seat = s.seat_number;
      div.addEventListener('click', ()=>{
        if (div.classList.contains('booked')) return; // cannot select booked to toggle? allow selection anyway
        if (div.classList.contains('selected')){
          div.classList.remove('selected');
          selectedSeatNumbers.delete(s.seat_number);
        } else {
          div.classList.add('selected');
          selectedSeatNumbers.add(s.seat_number);
        }
      });
      els.seatGrid.appendChild(div);
    });
  }

  function styleSeat(el, status){
    el.style.background = '';
    el.style.border = '';
    el.classList.remove('booked','available');
    if (status==='booked'){
      el.classList.add('booked');
      el.style.background = '#333';
      el.style.border = '1px solid #555';
    } else {
      el.classList.add('available');
      el.style.background = getComputedStyle(document.documentElement).getPropertyValue('--light-bg') || '#1b1b1b';
      el.style.border = '1px solid #333';
    }
  }

  async function bulkUpdate(status){
    const movieId = els.movieSelect.value;
    if (!movieId || selectedSeatNumbers.size===0) return;
    const payload = { seats: Array.from(selectedSeatNumbers).map(n=>({ seat_number: n, status })) };
    await fetch(`${API}/movies/${movieId}/seats`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    await loadSeats(movieId);
    selectedSeatNumbers.clear();
  }

  async function addRows(){
    const movieId = els.movieSelect.value;
    const val = (els.addRowsInput.value||'').trim();
    // Format: H-J,12  => rows H..J with 12 seats each
    const m = val.match(/^([A-Za-z])-([A-Za-z])\s*,\s*(\d{1,2})$/);
    if (!m){ alert('Use format like H-J,12'); return; }
    const [_, from, to, count] = m;
    const rows = [{ labelFrom: from.toUpperCase(), labelTo: to.toUpperCase(), count: parseInt(count,10) }];
    await fetch(`${API}/movies/${movieId}/seats/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows })
    });
    await loadSeats(movieId);
    els.addRowsInput.value='';
  }

  function splitSeat(code){
    const match = String(code).match(/([A-Za-z]+)(\d+)/);
    return [match?match[1].toUpperCase():'A', match?parseInt(match[2],10):0];
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }
})();

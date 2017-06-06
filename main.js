'use restrict';

function init(content, _with_manga_tag, _is_excluding_high_aspect_ratio, _smallest_includable_aspect_ratio) {
  let with_manga_tag = (typeof _with_manga_tag !== undefined) ? _with_manga_tag : false;
  let is_excluding_high_aspect_ratio = (typeof _is_excluding_high_aspect_ratio !== undefined) ? _is_excluding_high_aspect_ratio : false;
  let smallest_includable_aspect_ratio = (typeof _smallest_includable_aspect_ratio !== undefined) ? _smallest_includable_aspect_ratio : 3;

  let SOURCE_URI = `https://www.pixiv.net/ranking.php?mode=daily&format=json&content=${content}`;
  const promiseList = [];

  if (content === "original") {
    SOURCE_URI = `https://www.pixiv.net/ranking.php?format=json&mode=original`;
  }

  for (let i = 1; i <= 3; i++) {
    // cannnot fetch ugoira ranking over page 3.
    if (content === "ugoira" && i > 2) {
        break;
    }
    const p = axios.get(`${SOURCE_URI}&p=${i}`);
    promiseList.push(p);
  }

  Promise.all(promiseList).then(values => {
    const items = [];
    let illustrations = [];

    values = values.filter(response => {
      return response.status === 200;
    });

    values.forEach(response => {
      let filtered = response.data.contents;
      if (!with_manga_tag) {
        filtered = filtered.filter(content => {
          // GOOD -> return (includes(content.tags, 'Fate/GrandOrder') === true);
          // BAD -> return (includes(content.tags, '漫画') === true);
          return (content.tags.includes('漫画') === false);
        });
      }

      if (is_excluding_high_aspect_ratio) {
        filtered = filtered.filter(content => {
          return (content.height / content.width <= smallest_includable_aspect_ratio);
        });
      }

      // Extracting illustration info
      filtered.forEach(content => {
          illustrations.push({
            'illustrationId': content.illust_id,
            'illustrationUrl': content.url,
            'illustrationTitle': content.title,
            'illustrationTags': content.tags,
            'userName': content.user_name,
          });
      });
    });

    // Shuffle.
    illustrations = shuffle(illustrations);

    // Inserting elements to a New tab page body.
    illustrations.forEach(illust => {
      items.push(createGalleryItem(
        illust.illustrationId,
        illust.illustrationUrl,
        illust.illustrationTitle,
        illust.illustrationTags,
        illust.userName
      ));
    });

    // Wait for image loading
    return Promise.all(items.map(item => {
      return new Promise(resolve => {
        item.img.onload = item.img.onerror = () => resolve(item);
      });
    }));
  })
  .then(items => {
    items.forEach(item => {
      document.querySelector('#gallery').appendChild(item.anchor);
    });

    setTimeout(() => {
      items.forEach(item => item.img.classList.add('loaded'));
    }, 125);
  }).catch(response => {
    console.log(response);
  });
}

function resetGallery() {
    const gallery = document.querySelector('#gallery');
    while (gallery.firstChild) {
        gallery.removeChild(gallery.firstChild);
    }
}

document.addEventListener('DOMContentLoaded', event => {
  var v = new Vue({
      el: '#setting',
      data: {
          selected: (window.localStorage && window.localStorage.getItem('content')) ? window.localStorage.getItem('content') : 'illust',
          options: [
              {value: 'illust'},
              {value: 'original'},
              {value: 'manga'},
              {value: 'ugoira'},
          ],
          with_manga_tag: getBooleanFromLocalStorage('contents_with_manga_tag'),
          is_excluding_high_aspect_ratio: getBooleanFromLocalStorage('is_excluding_high_aspect_ratio'),
          smallest_includable_aspect_ratio: getNumberFromLocalStorage('smallest_includable_aspect_ratio', 3),
      },
      watch: {
          with_manga_tag: function (newChecked){
              setBooleanToLocalStorage('contents_with_manga_tag', newChecked);
               resetGallery();
               init(this.selected, this.with_manga_tag, this.is_excluding_high_aspect_ratio, this.smallest_includable_aspect_ratio);
          },
          is_excluding_high_aspect_ratio: function (newChecked) {
              setBooleanToLocalStorage('is_excluding_high_aspect_ratio', newChecked);
              resetGallery();
              init(this.selected, this.with_manga_tag, this.is_excluding_high_aspect_ratio, this.smallest_includable_aspect_ratio);
          },
          selected: function (newSelected){
               if (window.localStorage) {
                   window.localStorage.setItem('content', newSelected);
               }
               resetGallery();
               init(newSelected, this.with_manga_tag, this.is_excluding_high_aspect_ratio, this.smallest_includable_aspect_ratio);
          }
      }
  });

  init(v.selected, v.with_manga_tag, v.is_excluding_high_aspect_ratio, v.smallest_includable_aspect_ratio);
});

function createIllustrationElement(imageUrl, title, author) {
  const img = new Image();
  img.src = imageUrl;
  img.alt = `${author} / ${title}`;
  return img;
}

function createGalleryItem(illustrationId, imageUrl, title, tags, author) {
    const linkUrl = `https://www.pixiv.net/i/${illustrationId}`;
    const img = createIllustrationElement(imageUrl, title, author);
    img.setAttribute('alt', tags.join(' '));
    const anchor = document.createElement('a');
    anchor.setAttribute('href', linkUrl);
    anchor.setAttribute('target', 'pixiv');
    anchor.appendChild(img);
    return {anchor, img};
}

function shuffle(array) {
  let n = array.length;

  while (n) {
    const i = Math.floor(Math.random() * n--);
    const t = array[n];
    array[n] = array[i];
    array[i] = t;
  }

  return array;
}

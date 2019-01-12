function validateText() {
  function formatParagraph(myText){
    myText = myText.replace(/\s+/g, ' '); //supprimer les doubles espaces
    myText = myText.replace(/(Chapeau|Regeste|Faits|Considérants)/g, '<h4>$1</h4>');

    //articles
      myLaws.forEach(function(law){
        var myRegex = '[A|a]rt\\.\\s+(.*?) '+law;
        var myRe = new RegExp(myRegex,'g');
        var myArticles = myText.match(myRe);
        // Controle de longueur de la phrase
        var myCtrlRegex = '[a-zA-Z]{5}';
        var myCtrlRe = new RegExp(myCtrlRegex,'g');
        if(myArticles !== null && myArticles.length > 0){
          for( var l = 0; l < myArticles.length; l++){
             if(myArticles[l].match(myCtrlRe)){
               myArticles.splice(l, 1);
             }
          }
        }

        //Art. 4 Cst, 312 al. 1 CC
        var myArticleRegex = '([A|a]rt\\.|ter|et|al\\.\\s*\\d|,|ch\\.\\s*\\d|ou|cbis|Tit\\.|fin\\.|'+law+')';
        var myArticleRe = new RegExp(myArticleRegex,'g');

        if(myArticles && myArticles.length > 0){
          myDictArticles[law] = [];
          myArticles.forEach(function(article){
            myNrArticle = article.replace(myArticleRe, '');
            myNrArticle = myNrArticle.replace(/\s+/g, ' ').trim(); //supprimer les doubles espaces
            myNrArticleList = myNrArticle.match(/\d+/g);// récupérer uniquement les numéros d'articles
            myNrArticleList.forEach(function(articleNr){
              myDictArticles[law].push(articleNr); // ajouter l'article à la clé du dictionnaire
            });
          });
          // Supprimer les doublons pour la clé
          myDictArticles[law] = [...new Set(myDictArticles[law])];
        }
        // Pour remplacer les mentions d'articles en incluant une balise
        var myRegexLaw = '[A|a]rt\\.\\s+(.*?) '+law;
        //var myRegexLaw = '([A|a]rt\\.\\s+)(.*?)('+law+')[\.|\,|\s|\;|\)|\:]';
        //var myRegexLaw = '[A|a]rt\\.\\s+(.*?) '+law+'[\.|\,|\s|\;|\)|\:]';
        var myReLaw = new RegExp(myRegexLaw,'g');

        myText = myText.replace(myReLaw, function($1, $2, $3, $4){
          // Controle de longueur de la phrase
          var myCtrlRegex = '[a-zA-Z]{5}';
          var myCtrlRe = new RegExp(myCtrlRegex,'g');
          // Si le texte n'est pas trop long (=erreur)
          if($1.match(myCtrlRe)){
            var myRegexLawReplace = $1;
            return myRegexLawReplace;
          }
          else{
            var myRegexLawReplace = '<span class="legal-reference '+law+'">'+$1+'</span><!--ﬁ-->'; // le signe ﬁ permet de stopper l'expression régulière dans la fonction "addReferences"
            return myRegexLawReplace;
          }
        });
    });
    return myText;
  }

  function addReferences(myText){
    if (Object.keys(myDictArticles).length > 0){
      for (var key in myDictArticles) {
        // récupérer le contenu des textes de lois utilisés dans le texte
        $.ajax({
           type : 'GET',
           dataType : 'json',
           url: 'data/legal/' + key + '.json',
           async:false,
           success: function(data){
              // Pour chaque texte de loi, on va récupérer la balise div correspondante
              myDictArticles[key].forEach(function(refArticle){
                try{
                  var myRegexReference = '(<span class="legal-reference '+key+'">[^ﬁ]*?[ |/|-]+)('+refArticle+')([^<]*?</span>)';
                  var myReReference = new RegExp(myRegexReference,'g');

                  // modification des articles et ajouts des liens
                  myText = myText.replace(myReReference, function($1, $2, $3, $4){
                    // Vériier qu'on utilise bien le bon article
                    if($3 == refArticle){
                      popoverNumber+=1;
                      var myRegexReferenceReplace = $2+'<a id="popoverOption-'+popoverNumber+'" class="legal-links" href="#" data-content="'+data['Art. '+$3]['contenu']+'" rel="popover" data-placement="top" data-original-title="Art. '+$3+' '+key+' ('+data['Art. '+$3]['titre']+')">'+$3+'</a>'+$4;
                      return myRegexReferenceReplace;
                    }
                    else{
                      return $1;
                    }
                  });
                }
                catch(e){}
              });
           },
          complete: function (data) {
              writeNewText(myText);
           }
        });
      }
    }
    else{
      console.log("no dict");
      writeNewText(myText);
    }
  }

  function writeNewText(myText){
    $("#textField").empty(); //supprimer le contenu de l'id "textField"
    $("#textField").append('<div id="textContent"><div class="panel panel-default"><div class="panel-heading"><i class="fa fa-legal fa-fw"></i> Arrêt du Tribunal Fédéral</div><div id="textBody" class="panel-body"><p>' + myText.trim() + '</p></div><div class="panel-footer"> </div></div></div>'); //écrire le contenu nettoyé dans la div "legalText"

    //supprimer le bouton submit
    $("#mySubmitButton").empty(); //supprimer le contenu de l'id "legalText"
    $("#mySubmitButton").append('<fieldset disabled><button type="submit" class="btn btn-primary">Disabled Button</button></fieldset>');

    // Pour activer les boutons popover
    for (i = 1; i < popoverNumber+1; i++) {
      $('#popoverOption-'+i).popover({ trigger: "hover" });
    }
  }

  function detectDates(myText){
    // Pour récupérer les dates uniquement dans les faits
    var myDictDates = {};
    myText.match(/<h4>Faits<\/h4>(.*?)<h4>Considérants<\/h4>/g).map(function(val){
      // Pour récupérer les dates entres 1900 et 2019
       var myDates = val.match(/\b(19\d\d|20[0|1]\d)\b/g).map(function(dates){
         return dates;
       });

       // Supprimer les doublons pour la clé
       myDates = [...new Set(myDates)];

       // Pour chaque date, on va trouver la phrase associée et la mettre dans un dictionnaire
       myDates.forEach(function(date){
         var myRegexRelatedStrings = '([^\.,\!\?]*?'+date+'[^\.,\!\?]*?)';
         var myRelatedStrings = new RegExp(myRegexRelatedStrings,'g');
         var myResult = val.match(myRelatedStrings, myRegexRelatedStrings);
         //Suppression des espaces au début
         myResult = myResult.map(function(x){return x.replace(/^\s+/g, '');});
         myDictDates[date] = myResult;
       });
    });

    $("#timeline-dates").empty(); //supprimer le contenu de la timeline
    i = 0;
    for (var key in myDictDates) {

      // Pour supprimer les phrases qui contiennent d'autres phrases de la liste comme: "Par jugement du 23 décembre 2016" et "du 23 décembre 2016"
      for (var j = 0; j < myDictDates[key].length; j++) {
        for (var k = 0; k < myDictDates[key].length; k++) {
          if(myDictDates[key][j].includes(myDictDates[key][k]) && myDictDates[key][j] != myDictDates[key][k]){
            // On supprime l'élément qui contient l'autre élément plus petit
            myDictDates[key].splice( myDictDates[key].indexOf(myDictDates[key][j]), 1 );
          }
        }
      }

      // pour supprimer les doublons dans la liste
      myDictDates[key] = [...new Set(myDictDates[key])];

      //console.log(myDictDates[key]);

      // Pour remplacer les mentions d'années en incluant une balise
      myDictDates[key].forEach(function(dateString){
        var myRegexYears = '('+dateString+')';
        var myReYears = new RegExp(myRegexYears,'g');
        var myRegexYearsReplace = '<span class="dates-string '+key+'">'+dateString+'</span>';
        myText = myText.replace(myReYears, myRegexYearsReplace);
      });
      if(i % 2 == 0){
        $("#timeline-dates").append('<li><div class="timeline-badge warning"><i class="fa fa-clock-o"></i></div><div class="timeline-panel dates-string '+key+'" onmouseover="highlight('+key+')" onmouseout="unhighlight('+key+')"><div class="timeline-heading"><h4 class="timeline-title">'+key+'</h4></div><div class="timeline-body"><p><span>Afficher les mentions pour l\'année '+key+'</span></p></div></div>');
      }
      else{
        $("#timeline-dates").append('<li class="timeline-inverted"><div class="timeline-badge warning"><i class="fa fa-clock-o"></i></div><div class="timeline-panel dates-string '+key+'" onmouseover="highlight('+key+')" onmouseout="unhighlight('+key+')"><div class="timeline-heading"><h4 class="timeline-title">'+key+'</h4></div><div class="timeline-body"><p><span>Afficher les mentions pour l\'année '+key+'</span></p></div></div>');
      }
      i++;
    }
    return myText;
  }

  //récupérer le contenu de l'id "legalText"
  var myText = $('#legalText').val();

  // Liste des textes de loi
  var myLaws = ["CC", "CP", "Cst", "CO", "LPD", "CPP", "CPC"];
  // Articles par textes de loi dans le texte
  var myDictArticles = {};

  // Nombre de nouveaux popover
  var popoverNumber = 0;


  myText = formatParagraph(myText); //formater le contenu des textes
  myText = detectDates(myText); // formater les dates
  addReferences(myText); // ajouter les références
}

function createTable() {
  function createRows(){
    for (var key in myDict) {
      $("#table-content").append('<tr class="odd gradeX"><td><div onclick=\'loadNewPage("'+myDict[key]['titre']+'")\'><b>'+myDict[key]['titre']+'</b></div></td><td>'+myDict[key]['annee']+'</td><td class="center">'+myDict[key]['abstract']+'</td></tr>');
    }
  }
  console.log("create table");
  var myDict = {};
  $("#table-content").empty();
  $.ajax({
     type : 'GET',
     dataType : 'json',
     url: 'data/list_arrets.json',
     async:false,
     success: function(data){
       myDict = data;
     },
     complete: function (data) {
        createRows(myDict);
     }
  });
}
